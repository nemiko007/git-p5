use axum::{
    routing::get,
    Router,
    http::{StatusCode},
    extract::{Query, State},
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use std::env;
use chrono::{Utc, FixedOffset, TimeZone};
use firestore::FirestoreDb;

// --- 構造体・ENUM定義 ---

#[derive(Deserialize)]
pub struct CheckQuery {
    secret: String,
}

#[derive(Serialize)]
struct GraphQLQuery<'a> {
    query: &'a str,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct GitHubResponse {
    data: Option<Data>,
}
#[derive(Deserialize, Debug)]
struct Data {
    user: Option<User>,
}
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct User {
    contributions_collection: ContributionsCollection,
}
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct ContributionsCollection {
    contribution_calendar: ContributionCalendar,
}
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct ContributionCalendar {
    total_contributions: i32,
}



#[derive(Serialize)]
pub struct ApiResponse {
    username: String,
    date: String,
    contribution_count: i32,
    is_angry: bool,
    db_update_status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Monster {
    pub status: String,
    pub anger_level: i32,
    pub last_check: String,
}

// --- 初期化関数 ---

pub async fn init_firestore() -> FirestoreDb {
    dotenvy::dotenv().ok();
    let project_id = env::var("FIRESTORE_PROJECT_ID")
        .expect("FIRESTORE_PROJECT_ID must be set");
    
    // For Vercel, we might want to read service account from an environment variable as a JSON string
    // if GOOGLE_APPLICATION_CREDENTIALS (the file path) is not suitable or available.
    // However, the firestore crate's FirestoreDb::new() internally uses gcloud-sdk which looks for 
    // GOOGLE_APPLICATION_CREDENTIALS environment variable (file path).
    
    FirestoreDb::new(&project_id)
        .await
        .expect("Failed to create Firestore client")
}

// --- メインのハンドラー関数 ---

pub async fn get_monster_handler(
    State(db): State<FirestoreDb>,
) -> impl IntoResponse {
    let monster: Option<Monster> = match db.fluent()
        .select()
        .by_id_in("monsters")
        .obj()
        .one("user_1")
        .await 
    {
        Ok(m) => m,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Firestore error: {}", e)).into_response(),
    };

    match monster {
        Some(m) => (StatusCode::OK, Json(m)).into_response(),
        None => (StatusCode::NOT_FOUND, "Monster not found").into_response(),
    }
}

pub async fn check_handler(
    State(db): State<FirestoreDb>,
    Query(_query): Query<CheckQuery>
) -> impl IntoResponse {
    // TODO: secretの検証ロジックを後で追加

    dotenvy::dotenv().ok();

    let github_token = match env::var("GITHUB_TOKEN") {
        Ok(token) => token,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "GITHUB_TOKEN is not set").into_response(),
    };
    let github_username = match env::var("GITHUB_USERNAME") {
        Ok(name) => name,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "GITHUB_USERNAME is not set").into_response(),
    };

    let jst = FixedOffset::east_opt(9 * 3600).unwrap();
    let now_jst = Utc::now().with_timezone(&jst);
    let today_jst = now_jst.date_naive();
    let from_datetime = jst.from_local_datetime(&today_jst.and_hms_opt(0, 0, 0).unwrap()).unwrap().to_rfc3339();
    let to_datetime = jst.from_local_datetime(&today_jst.and_hms_opt(23, 59, 59).unwrap()).unwrap().to_rfc3339();

    let query_string = format!(
        r#"query {{
            user(login: "{}") {{
                contributionsCollection(from: "{}", to: "{}") {{
                    contributionCalendar {{ totalContributions }}
                }}
            }}
        }}"#,
        github_username, from_datetime, to_datetime
    );

    let client = reqwest::Client::new();
    let res = match client
        .post("https://api.github.com/graphql")
        .header("Authorization", format!("Bearer {}", github_token))
        .header("User-Agent", "grass-reaper-robot")
        .json(&GraphQLQuery { query: &query_string })
        .send()
        .await
    {
        Ok(res) => res,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("GitHub API Request failed: {}", err)).into_response(),
    };

    if res.status() != reqwest::StatusCode::OK {
        let error_body = res.text().await.unwrap_or_default();
        return (StatusCode::BAD_GATEWAY, format!("GitHub API returned an error: {}", error_body)).into_response();
    }

    let github_response = match res.json::<GitHubResponse>().await {
        Ok(data) => data,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse GitHub API response: {}", err)).into_response(),
    };

    let contribution_count = github_response.data.and_then(|d| d.user).map(|u| u.contributions_collection.contribution_calendar.total_contributions).unwrap_or(0);
    let is_angry = contribution_count == 0;

    // Firebase Firestoreを更新
    let new_status_str = if is_angry { "HUNGRY" } else { "SATISFIED" };
    let new_anger_level = if is_angry { 100 } else { 0 };

    // Firestoreに送る更新データペイロードを作成
    let payload = Monster {
        status: new_status_str.to_string(),
        anger_level: new_anger_level,
        last_check: now_jst.to_rfc3339(),
    };
    
    let db_update_status = match db.fluent()
        .update()
        .in_col("monsters")
        .document_id("user_1")
        .object(&payload)
        .execute::<Monster>()
        .await
    {
        Ok(_) => "Success".to_string(),
        Err(e) => format!("Failed: {}", e),
    };
    let api_response = ApiResponse {
        username: github_username,
        date: today_jst.to_string(),
        contribution_count,
        is_angry,
        db_update_status,
    };

    (StatusCode::OK, Json(api_response)).into_response()
}

// アプリケーションのルーターを組み立てる関数
// State の型も FirestoreDb に変更
pub fn app_router() -> Router<FirestoreDb> {
    Router::<FirestoreDb>::new()
        .route("/api/check", get(check_handler))
        .route("/api/monster", get(get_monster_handler))
}
