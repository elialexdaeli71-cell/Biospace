import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpaceSearchService, SearchHit } from '../../../services/space-search';

type Sender = 'user' | 'bot';
interface Msg { from: Sender; text: string; hits?: SearchHit[]; }

@Component({
  selector: 'app-space-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './space-bot.html',
  styleUrls: ['./space-bot.scss']
})
export class SpaceBotComponent {
  isOpen = false;
  input  = '';
  typing = false;

  messages: Msg[] = [
    { from:'bot', text:'¡Hola! Soy tu ayudante del clima espacial. Pregúntame sobre viento solar, EMC, auroras, GPS…' }
  ];

  private api = inject(SpaceSearchService);

  toggle(){ this.isOpen = !this.isOpen; }

  async ask(){
    const q = this.input.trim();
    if (!q) return;
    this.messages.push({ from:'user', text:q });
    this.input = '';
    this.typing = true;

    try {
      const hits: SearchHit[] = await this.api.searchWeb(`${q} clima espacial`);
      const text = this.buildAnswer(q, hits);
      this.messages.push({ from:'bot', text, hits });
    } catch {
      this.messages.push({ from:'bot', text:'No pude buscar ahora. Intenta de nuevo en un momento.' });
    } finally {
      this.typing = false;
    }
  }

  private buildAnswer(q: string, hits: SearchHit[]): string {
    if (!hits?.length) return `No encontré algo confiable ahora sobre **${q}**. Dame otra pista o pregunta.`;
    const top = hits[0];
    return `Esto es lo que encontré sobre **${q}**:\n${top.snippet}\n\nTe dejo más fuentes debajo.`;
  }

  safe(text: string){ return (text || '').replace(/\n/g,'<br>'); }
}
