use axum::Router;
use vercel_axum::vercel_handler;

// 共通ライブラリからルーターを組み立てる関数をインポート
use git_p5::app_router;

// vercel_handlerマクロが、axumのRouterをVercelの形式に変換してくれる！
#[vercel_handler]
pub async fn handler() -> Router {
    let db = git_p5::init_firestore().await;
    app_router().with_state(db)
}
