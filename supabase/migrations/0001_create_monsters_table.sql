-- 'monster_status' という名前のENUM型を新しく作る
-- これで status カラムには 'HUNGRY' か 'SATISFIED' しか入らなくなるよ！
CREATE TYPE public.monster_status AS ENUM ('HUNGRY', 'SATISFIED');

-- 'monsters' テーブルを作成する
-- 仕様書通りの構成だよん！
CREATE TABLE public.monsters (
  id bigint PRIMARY KEY,
  status public.monster_status NOT NULL,
  last_check timestamptz NOT NULL,
  anger_level integer NOT NULL CHECK (anger_level >= 0 AND anger_level <= 100)
);

-- テーブルの所有者を 'postgres' に設定 (Supabaseの標準的な設定)
ALTER TABLE public.monsters OWNER TO postgres;

-- RLS (Row Level Security) を有効にする！
-- これで、デフォルトでは誰もデータにアクセスできなくなるからセキュリティ的に安心✨
ALTER TABLE public.monsters ENABLE ROW LEVEL SECURITY;

-- 初期データを挿入する (id: 1 は固定)
-- とりあえずお腹すいてる状態で、現在時刻、怒りレベル0で初期化！
INSERT INTO public.monsters (id, status, last_check, anger_level)
VALUES (1, 'HUNGRY', now(), 0);

-- 補足:
-- この後、APIからデータを読み書きするためのポリシー (POLICY) を作る必要があるけど、
-- それはAPIを実装するときにまた考えよっか！😉
