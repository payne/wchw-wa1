import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-mode';

  readonly isDarkMode = signal(this.loadThemePreference());

  constructor() {
    effect(() => {
      const isDark = this.isDarkMode();
      this.applyTheme(isDark);
      localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
    });
  }

  private loadThemePreference(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return stored === 'dark';
    }
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(isDark: boolean): void {
    document.body.classList.toggle('dark-theme', isDark);
  }

  toggleTheme(): void {
    this.isDarkMode.update(current => !current);
  }
}
