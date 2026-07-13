import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Template } from '../../../shared/types';

export class TemplateStore {
  private templatesDirPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.templatesDirPath = path.join(userDataPath, 'templates');
    this.ensureDirectoryExists(this.templatesDirPath);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public getTemplates(): Template[] {
    const templates: Template[] = [];
    try {
      const dirs = fs.readdirSync(this.templatesDirPath, { withFileTypes: true });
      for (const entry of dirs) {
        if (entry.isDirectory()) {
          const templateJsonPath = path.join(this.templatesDirPath, entry.name, 'template.json');
          if (fs.existsSync(templateJsonPath)) {
            const content = fs.readFileSync(templateJsonPath, 'utf8');
            try {
              const template = JSON.parse(content) as Template;
              templates.push(template);
            } catch (err) {
              console.error(`Error parsing template.json in ${entry.name}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to list templates:', error);
    }
    return templates;
  }

  public getTemplate(id: string): Template | null {
    const templateJsonPath = path.join(this.templatesDirPath, id, 'template.json');
    if (fs.existsSync(templateJsonPath)) {
      try {
        const content = fs.readFileSync(templateJsonPath, 'utf8');
        return JSON.parse(content) as Template;
      } catch (err) {
        console.error(`Error reading template ${id}:`, err);
      }
    }
    return null;
  }

  public saveTemplate(
    template: Template,
    assetFiles?: { background?: string; logo?: string; watermark?: string }
  ): Template {
    const templateFolder = path.join(this.templatesDirPath, template.id);
    this.ensureDirectoryExists(templateFolder);

    const updatedTemplate = { ...template };

    // Copy assets if they are referenced from outside the template directory
    if (assetFiles) {
      if (assetFiles.background && fs.existsSync(assetFiles.background)) {
        const ext = path.extname(assetFiles.background) || '.png';
        const destName = `background${ext}`;
        const destPath = path.join(templateFolder, destName);
        fs.copyFileSync(assetFiles.background, destPath);
        updatedTemplate.backgroundPath = destPath;
      }

      if (assetFiles.logo && fs.existsSync(assetFiles.logo)) {
        const ext = path.extname(assetFiles.logo) || '.png';
        const destName = `logo${ext}`;
        const destPath = path.join(templateFolder, destName);
        fs.copyFileSync(assetFiles.logo, destPath);
        updatedTemplate.logoPath = destPath;
      }

      if (assetFiles.watermark && fs.existsSync(assetFiles.watermark)) {
        const ext = path.extname(assetFiles.watermark) || '.png';
        const destName = `watermark${ext}`;
        const destPath = path.join(templateFolder, destName);
        fs.copyFileSync(assetFiles.watermark, destPath);
        updatedTemplate.watermarkPath = destPath;
      }
    }

    const templateJsonPath = path.join(templateFolder, 'template.json');
    fs.writeFileSync(templateJsonPath, JSON.stringify(updatedTemplate, null, 2), 'utf8');

    return updatedTemplate;
  }

  public deleteTemplate(id: string): void {
    const templateFolder = path.join(this.templatesDirPath, id);
    if (fs.existsSync(templateFolder)) {
      try {
        fs.rmSync(templateFolder, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to delete template folder ${id}:`, error);
      }
    }
  }
}

// Singleton
let instance: TemplateStore | null = null;
export function getTemplateStore(): TemplateStore {
  if (!instance) {
    instance = new TemplateStore();
  }
  return instance;
}
