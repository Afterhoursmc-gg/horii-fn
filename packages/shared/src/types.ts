export type Region='EU'|'NA'|'AS'; export type CosmeticCategory='outfits'|'back_blings'|'pickaxes'|'gliders'|'emotes'|'wraps'|'loading_screens';
export type PublicUser={id:string;email:string;displayName:string;role:'player'|'admin';suspended:boolean};
export type MockSessionConnection={host:string;port:number;token:string;expiresAt:string;notice:string};
