import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acerca',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './acerca.html',
  styleUrls: ['./acerca.scss']
})
export class AcercaComponent {}
