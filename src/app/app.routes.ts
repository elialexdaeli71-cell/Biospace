import { Routes } from '@angular/router';
import { HomeComponent }     from './pages/home/home';
import { AcercaComponent }   from './pages/acerca/acerca';
import { ProblemaComponent } from './pages/problema/problema';
import { MapaComponent }     from './pages/mapa/mapa';
import { ImpactoComponent }  from './pages/impacto/impacto';
import { JuegoComponent }    from './pages/juego/juego';
import { CuentoComponent }   from './pages/cuento/cuento.component'; // 👈 IMPORTANTE


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', component: HomeComponent },
  { path: 'acerca', component: AcercaComponent },
  { path: 'problema', component: ProblemaComponent },
  { path: 'mapa', component: MapaComponent },
  { path: 'impacto', component: ImpactoComponent },
  { path: 'juego', component: JuegoComponent },
  { path: 'cuento', component:CuentoComponent },
  


  // IA (carga perezosa del componente standalone)

  { path: '**', redirectTo: 'home' }
];
