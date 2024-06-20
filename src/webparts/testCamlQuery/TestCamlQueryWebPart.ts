import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';
import { escape } from '@microsoft/sp-lodash-subset';

import styles from './TestCamlQueryWebPart.module.scss';
import * as strings from 'TestCamlQueryWebPartStrings';
import { spfi, SPFx } from "@pnp/sp";
import { Web } from "@pnp/sp/webs"; 
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import { LogLevel, PnPLogging } from "@pnp/logging";

export interface ITestCamlQueryWebPartProps {
  description: string;
  division : string;
  teamTermID : string;
  parentTermID : string;
  libraryFlag: boolean[];
}

export default class TestCamlQueryWebPart extends BaseClientSideWebPart<ITestCamlQueryWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  public async render(): Promise<void> {
    const libraryName : string[] = ["Policies", "Procedures", "Guides", "Forms", "General"];
    this.properties.libraryFlag = [];

    this.domElement.innerHTML = `
    <section class="${styles.testCamlQuery} ${!!this.context.sdks.microsoftTeams ? styles.teams : ''}">
      <div class="${styles.welcome}">
        <img alt="" src="${this._isDarkTheme ? require('./assets/welcome-dark.png') : require('./assets/welcome-light.png')}" class="${styles.welcomeImage}" />
        <h2>Well done, ${escape(this.context.pageContext.user.displayName)}!</h2>
        <div>${this._environmentMessage}</div>
        <div>Web part property value: <strong>${escape(this.properties.description)}</strong></div>
      </div>
      <div>
        <h3>Welcome to SharePoint Framework!</h3>
        <p>
        The SharePoint Framework (SPFx) is a extensibility model for Microsoft Viva, Microsoft Teams and SharePoint. It's the easiest way to extend Microsoft 365 with automatic Single Sign On, automatic hosting and industry standard tooling.
        </p>
        <h4>Learn more about SPFx development:</h4>
          <ul class="${styles.links}">
            <li><a href="https://aka.ms/spfx" target="_blank">SharePoint Framework Overview</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-graph" target="_blank">Use Microsoft Graph in your solution</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-teams" target="_blank">Build for Microsoft Teams using SharePoint Framework</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-viva" target="_blank">Build for Microsoft Viva Connections using SharePoint Framework</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-store" target="_blank">Publish SharePoint Framework applications to the marketplace</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-api" target="_blank">SharePoint Framework API reference</a></li>
            <li><a href="https://aka.ms/m365pnp" target="_blank">Microsoft 365 Developer Community</a></li>
          </ul>
      </div>
    </section>`;

    for (let x = 0; x < libraryName.length; x++) {
      await this.checkData(x,libraryName[x],"IPES Wales",""); //.then( ()=>{  
      console.log("library",libraryName[x],this.properties.libraryFlag[x]);      
    }
  }
  
  private async checkData(num:number,library:string,team:string,category:string): Promise<any>{ //:Promise<ISPLists> {
    
    const sp = spfi().using(SPFx(this.context)).using(PnPLogging(LogLevel.Warning));  
    const tenant_uri = this.context.pageContext.web.absoluteUrl.split('/',3)[2];
    const dcDivisions : string[] = ["asm","cen","cnn","emp","hea"];
    let view: string = "";
    //let dataFlag : boolean = false;

    if (category === "") {
      view =
        `<View><Query>
          <Where>
            <Or>
              <Eq>
                <FieldRef Name="DC_Team"/>
                <Value Type="TaxonomyFieldType">${team}</Value>
              </Eq>
              <Contains>
                <FieldRef Name="DC_SharedWith"/>
                <Value Type="TaxonomyFieldTypeMulti">${team}</Value>
              </Contains>
            </Or>
          </Where>
        </Query>
        </View>`;
    } else {
      view =
        `<View><Query>
          <Where>
            <Or>
              <Eq>
                <FieldRef Name="DC_Category"/>
                <Value Type="TaxonomyFieldType">${category}</Value>
              </Eq>
              <Contains>
                <FieldRef Name="DC_SharedWith"/>
                <Value Type="TaxonomyFieldTypeMulti">${category}</Value>
              </Contains>
            </Or>
          </Where>
        </Query>
        </View>`;
    }

    dcDivisions.forEach(async (site,index)=>{
      const dcTitle = site+"_dc";
      const webDC = Web([sp.web,`https://${tenant_uri}/sites/${dcTitle}/`]); 
      //console.log(site,index,`https://${tenant_uri}/sites/${dcTitle}/`);
      await webDC.lists.getByTitle(library)
        .getItemsByCAMLQuery({ViewXml:view},"FieldValuesAsText/FileRef", "FieldValueAsText/FileLeafRef")
        .then(async (results) => {
          console.log("check data",dcTitle," library",library,results);
          if(results.length>0){   
            console.log("response length",results.length);             
            this.properties.libraryFlag[num]=true;
          }
        })
    });
  }

  protected onInit(): Promise<void> {
    return this._getEnvironmentMessage().then(message => {
      this._environmentMessage = message;
    });
  }

  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) { // running in Teams, office.com or Outlook
      return this.context.sdks.microsoftTeams.teamsJs.app.getContext()
        .then(context => {
          let environmentMessage: string = '';
          switch (context.app.host.name) {
            case 'Office': // running in Office
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOffice : strings.AppOfficeEnvironment;
              break;
            case 'Outlook': // running in Outlook
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOutlook : strings.AppOutlookEnvironment;
              break;
            case 'Teams': // running in Teams
            case 'TeamsModern':
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
              break;
            default:
              environmentMessage = strings.UnknownEnvironment;
          }

          return environmentMessage;
        });
    }

    return Promise.resolve(this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
