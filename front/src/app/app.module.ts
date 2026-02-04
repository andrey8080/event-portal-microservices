import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EventCreateComponent } from './components/events/event-create/event-create.component';
import { EventEditComponent } from './components/events/event-edit/event-edit.component';
// Импортируйте другие необходимые модули и компоненты

@NgModule({
    declarations: [
        // Здесь только не-standalone компоненты
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        AppRoutingModule,
        // Импортируйте standalone компоненты, если используете гибридный подход
        EventCreateComponent,
        EventEditComponent
    ],
    providers: []
})
export class AppModule { }
