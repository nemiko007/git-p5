use git_p5::app_router;

#[tokio::main]
async fn main() {
    // Firestoreクライアントを初期化
    let db = git_p5::init_firestore().await;

    // ルーターを組み立てて、StateとしてFirestoreクライアントを渡す
    let app = app_router().with_state(db);

    // サーバーのアドレスを指定 (0.0.0.0:9000)
    let listener = tokio::net::TcpListener::bind("0.0.0.0:9000").await.unwrap();
    
    // サーバーが起動したことをコンソールに表示
    println!("🚀 Server listening on http://localhost:9000");

    // サーバーを起動
    axum::serve(listener, app).await.unwrap();
}