import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent implements OnInit {
  
  ngOnInit(): void {
    console.log('🚀 Header BIOSPACE inicializado');
    this.createBannerParticles();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.handleHeaderScroll();
  }

  private createBannerParticles(): void {
    const banner = document.querySelector('.banner');
    if (!banner) return;
    
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.classList.add('banner-particle');
      
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 6 + 2}px;
        height: ${Math.random() * 6 + 2}px;
        background: rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1});
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        animation: bannerFloat ${Math.random() * 20 + 10}s infinite linear;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
      `;
      
      banner.appendChild(particle);
    }
  }

  private handleHeaderScroll(): void {
    const header = document.querySelector('header') as HTMLElement;
    const banner = document.querySelector('.banner') as HTMLElement;
    
    if (header && banner) {
      const scrollY = window.scrollY;
      const bannerHeight = banner.offsetHeight;
      const opacity = Math.max(0, 1 - (scrollY / bannerHeight * 1.5));
      
      banner.style.opacity = opacity.toString();
      
      if (scrollY > 50) {
        header.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4)';
        header.style.background = 'rgba(26, 26, 46, 0.98)';
      } else {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        header.style.background = 'rgba(26, 26, 46, 0.95)';
      }
    }
  }

  onButtonClick(event: Event): void {
    const button = event.target as HTMLButtonElement;
    
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 150);
    
    this.navigateToGame();
  }

  private navigateToGame(): void {
    console.log('🎮 Navegando al juego...');
    const gameSection = document.getElementById('jugar');
    if (gameSection) {
      gameSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}