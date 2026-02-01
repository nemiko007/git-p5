use axum::body::to_bytes;
use tower::{ServiceExt, service_fn};
use vercel_runtime::{run, Error, Request, Response, ResponseBody};

// 共通ライブラリからルーターを組み立てる関数をインポート
use git_p5::app_router;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Firestoreの初期化 (エラー時は None にしてハンドラー側で報告させる)
    let db = git_p5::init_firestore().await.ok();
    
    // ルーターの構築
    let app = app_router().with_state(db);
    
    // Vercelランタイムの期待するシグネチャに合わせて実行
    run(service_fn(move |(_state, req): (vercel_runtime::AppState, Request)| {
        let app = app.clone();
        async move {
            // axum::Router でリクエストを処理
            let response = app.oneshot(req).await.unwrap();
            
            // レスポンスボディを Bytes に変換して ResponseBody を作成
            let (parts, body) = response.into_parts();
            let bytes = to_bytes(body, 10 * 1024 * 1024) // 10MB limit
                .await
                .map_err(|e| Error::from(format!("Failed to read body: {}", e)))?;
            
            let body = ResponseBody::from(bytes);
            Ok::<Response<ResponseBody>, Error>(Response::from_parts(parts, body))
        }
    })).await
}
