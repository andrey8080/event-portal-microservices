import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app-routing.module';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { tokenInterceptor } from './app/interceptors/token.interceptor';
import { errorInterceptor } from './app/interceptors/error.interceptor';

// Обновляем конфигурацию, добавляя необходимые провайдеры
const updatedConfig = {
    providers: [
        ...appConfig.providers,
        provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
        importProvidersFrom(BrowserAnimationsModule)
    ]
};

bootstrapApplication(AppComponent, updatedConfig)
    .catch(err => console.error(err));