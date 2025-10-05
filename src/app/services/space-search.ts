import { Injectable } from '@angular/core';

export interface SearchHit {
  title: string;
  link: string;
  snippet: string;
}

@Injectable({ providedIn: 'root' })
export class SpaceSearchService {
  // ⚠️ En producción NO hardcodes; por ahora lo dejamos así para probar.
  private KEY = 'AIzaSyDKqpszAGhc8DtsUR_5aO8pWxAvhfokJOw';
  private CX  = '34160aa43243146ca';

  async searchWeb(q: string): Promise<SearchHit[]> {
    if (!this.KEY || !this.CX) return [];

    // 👉 Sin template string para que PowerShell no lo modifique
    const url =
      'https://www.googleapis.com/customsearch/v1'
      + '?key=' + this.KEY
      + '&cx='  + this.CX
      + '&q='   + encodeURIComponent(q);

    try {
      const res = await fetch(url);
      if (!res.ok) { console.warn('[SpaceSearch] HTTP', res.status); return []; }
      const json: any = await res.json();
      const items: any[] = json?.items ?? [];
      return items.slice(0, 5).map((it: any) => ({
        title: String(it.title ?? ''),
        link : String(it.link ?? ''),
        snippet: String(it.snippet ?? '')
      }));
    } catch (e) {
      console.error('[SpaceSearch] Error', e);
      return [];
    }
  }
}
