import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpModule } from "@angular/http";

import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { RoutingModule } from "./modules/routing/routing.module";

import { AppComponent } from "./app.component";
import {
  AddQuestionComponent,
  DialogOverviewExampleDialog
} from "./pages/add-question/add-question.component";
import { HeaderComponent } from "./components/header/header.component";
import { FooterComponent } from "./components/footer/footer.component";
import { SidebarComponent } from "./components/sidebar/sidebar.component";

import { LayoutModule } from "@angular/cdk/layout";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  MatToolbarModule,
  MatButtonModule,
  MatSidenavModule,
  MatIconModule,
  MatListModule,
  MatGridListModule,
  MatCardModule,
  MatMenuModule,
  MatFormFieldModule,
  MatInputModule,
  MatOptionModule,
  MatSelectModule,
  MatCheckboxModule,
  MatTabsModule,
  MatExpansionModule,
  MatAccordion,
  MatExpansionPanel,
  MatDialogModule
} from "@angular/material";
import { NavigationComponent } from "./components/navigation/navigation.component";
import { HttpClientModule } from "@angular/common/http";
import { Oauth2callbackComponent } from "./components/oauth2callback/oauth2callback.component";
import { OauthLogoutcallbackComponent } from "./components/oauth-logoutcallback/oauth-logoutcallback.component";
import { AddCriteriaComponent } from "./pages/add-criteria/add-criteria.component";
import { RubricComponent } from "./components/rubric/rubric.component";
import { EvidenceComponent } from "./components/evidence/evidence.component";
import { CriteriaComponent } from "./pages/criteria/criteria.component";

@NgModule({
  declarations: [
    AppComponent,
    AddQuestionComponent,
    HeaderComponent,
    FooterComponent,
    SidebarComponent,
    NavigationComponent,
    Oauth2callbackComponent,
    OauthLogoutcallbackComponent,
    AddCriteriaComponent,
    RubricComponent,
    EvidenceComponent,
    CriteriaComponent,
    DialogOverviewExampleDialog
  ],
  imports: [
    BrowserModule,
    RoutingModule,
    NgbModule.forRoot(),
    BrowserAnimationsModule,
    LayoutModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatGridListModule,
    MatCardModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatTabsModule,
    MatExpansionModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    HttpModule,
    MatDialogModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [AppComponent, DialogOverviewExampleDialog]
})
export class AppModule {
  baseUrl: string = "/";
}
