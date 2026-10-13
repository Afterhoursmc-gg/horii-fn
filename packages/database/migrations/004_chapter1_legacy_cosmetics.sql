ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS season TEXT;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS source_set TEXT;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS legacy BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

INSERT INTO cosmetics(id,category,name,rarity,asset_url,season,source_set,legacy,metadata) VALUES
('legacy_outfit_renegade_raider','outfits','Renegade Raider','rare','/assets/placeholders/outfit.svg','S1','Chapter 1 Legacy',true,'{"requested":true,"chapter":1}'),
('legacy_outfit_black_knight','outfits','Black Knight','legendary','/assets/placeholders/outfit.svg','S2','Chapter 1 Legacy',true,'{"requested":true,"chapter":1}'),
('legacy_back_frozen_shroud','back_blings','Frozen Shroud','legendary','/assets/placeholders/back.svg','S7','Chapter 1 Legacy',true,'{"requested":true,"chapter":1}'),
('legacy_emote_floss','emotes','Floss','rare','/assets/placeholders/emote.svg','S2','Chapter 1 Legacy',true,'{"requested":true,"chapter":1}'),
('legacy_emote_take_the_l','emotes','Take the L','rare','/assets/placeholders/emote.svg','S3','Chapter 1 Legacy',true,'{"requested":true,"chapter":1}'),
('legacy_library_s1_all','legacy_libraries','Season 1 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S1','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S1"}'),
('legacy_library_s2_all','legacy_libraries','Season 2 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S2','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S2"}'),
('legacy_library_s3_all','legacy_libraries','Season 3 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S3','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S3"}'),
('legacy_library_s4_all','legacy_libraries','Season 4 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S4','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S4"}'),
('legacy_library_s5_all','legacy_libraries','Season 5 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S5','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S5"}'),
('legacy_library_s6_all','legacy_libraries','Season 6 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S6','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S6"}'),
('legacy_library_s7_all','legacy_libraries','Season 7 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S7','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S7"}'),
('legacy_library_s8_all','legacy_libraries','Season 8 Complete Legacy Library','legendary','/assets/placeholders/loading.svg','S8','Chapter 1 Legacy',true,'{"all_access_marker":true,"chapter":1,"season_range":"S8"}')
ON CONFLICT(id) DO UPDATE SET
  name=excluded.name,
  category=excluded.category,
  rarity=excluded.rarity,
  asset_url=excluded.asset_url,
  season=excluded.season,
  source_set=excluded.source_set,
  legacy=excluded.legacy,
  metadata=excluded.metadata,
  enabled=true;
