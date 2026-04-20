const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const packageRoot = path.resolve(__dirname, '..');
const distDir = path.join(packageRoot, 'dist');
const distPackageJson = path.join(distDir, 'package.json');
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
);

const requiredDistFiles = [
  distPackageJson,
  path.join(distDir, 'fesm2022'),
  path.join(distDir, 'types'),
];

for (const requiredPath of requiredDistFiles) {
  if (!fs.existsSync(requiredPath)) {
    console.error('Integration validation requires a built package in dist/.');
    console.error(`Missing: ${path.relative(packageRoot, requiredPath)}`);
    console.error('Run the build stages first, then rerun this test.');
    process.exit(1);
  }
}

const angularVersion = rootPackageJson.devDependencies['@angular/core'];
const buildVersion = rootPackageJson.devDependencies['@angular/build'];
const cliVersion = rootPackageJson.devDependencies['@angular/cli'];
const compilerCliVersion = rootPackageJson.devDependencies['@angular/compiler-cli'];
const typescriptVersion = rootPackageJson.devDependencies.typescript;
const rxjsVersion = rootPackageJson.devDependencies.rxjs;
const tslibVersion = rootPackageJson.dependencies.tslib;
const onlyBuiltDependencies = rootPackageJson.pnpm?.onlyBuiltDependencies ?? [];

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'angular-intl-tel-input-integration-'),
);
const appDir = path.join(tempRoot, 'app');
const srcDir = path.join(appDir, 'src');
const appSrcDir = path.join(srcDir, 'app');
const distPathForPnpm = distDir.replace(/\\/g, '/');

fs.mkdirSync(appSrcDir, { recursive: true });
fs.mkdirSync(path.join(appDir, 'public'), { recursive: true });

const writeFile = (relativePath, content) => {
  const fullPath = path.join(appDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
};

const quoteForShell = (value) => {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
};

writeFile(
  'package.json',
  JSON.stringify(
    {
      name: 'angular-intl-tel-input-integration-app',
      version: '0.0.0',
      private: true,
      packageManager: rootPackageJson.packageManager,
      pnpm: {
        onlyBuiltDependencies,
      },
      scripts: {
        ng: 'ng',
        build: 'ng build',
        start: 'ng serve',
      },
      dependencies: {
        '@angular/common': rootPackageJson.devDependencies['@angular/common'],
        '@angular/compiler': rootPackageJson.devDependencies['@angular/compiler'],
        '@angular/core': angularVersion,
        '@angular/forms': rootPackageJson.devDependencies['@angular/forms'],
        '@angular/platform-browser': rootPackageJson.devDependencies['@angular/platform-browser'],
        'angular-intl-tel-input': `file:${distPathForPnpm}`,
        rxjs: rxjsVersion,
        tslib: tslibVersion,
      },
      devDependencies: {
        '@angular/build': buildVersion,
        '@angular/cli': cliVersion,
        '@angular/compiler-cli': compilerCliVersion,
        typescript: typescriptVersion,
      },
    },
    null,
    2,
  ) + '\n',
);

writeFile(
  'angular.json',
  JSON.stringify(
    {
      $schema: './node_modules/@angular/cli/lib/config/schema.json',
      version: 1,
      cli: {
        packageManager: 'pnpm',
      },
      newProjectRoot: 'projects',
      projects: {
        'integration-app': {
          projectType: 'application',
          root: '',
          sourceRoot: 'src',
          prefix: 'app',
          architect: {
            build: {
              builder: '@angular/build:application',
              options: {
                browser: 'src/main.ts',
                tsConfig: 'tsconfig.app.json',
                assets: [
                  {
                    glob: '**/*',
                    input: 'public',
                  },
                ],
                styles: ['src/styles.css'],
              },
              configurations: {
                production: {
                  outputHashing: 'all',
                },
                development: {
                  optimization: false,
                  extractLicenses: false,
                  sourceMap: true,
                },
              },
              defaultConfiguration: 'production',
            },
            serve: {
              builder: '@angular/build:dev-server',
              configurations: {
                production: {
                  buildTarget: 'integration-app:build:production',
                },
                development: {
                  buildTarget: 'integration-app:build:development',
                },
              },
              defaultConfiguration: 'development',
            },
          },
        },
      },
    },
    null,
    2,
  ) + '\n',
);

writeFile(
  'tsconfig.json',
  JSON.stringify(
    {
      compileOnSave: false,
      compilerOptions: {
        strict: true,
        noImplicitOverride: true,
        noPropertyAccessFromIndexSignature: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        skipLibCheck: true,
        isolatedModules: true,
        experimentalDecorators: true,
        importHelpers: true,
        target: 'ES2022',
        module: 'preserve',
      },
      angularCompilerOptions: {
        enableI18nLegacyMessageIdFormat: false,
        strictInjectionParameters: true,
        strictInputAccessModifiers: true,
        strictTemplates: true,
      },
      files: [],
      references: [{ path: './tsconfig.app.json' }],
    },
    null,
    2,
  ) + '\n',
);

writeFile(
  'tsconfig.app.json',
  JSON.stringify(
    {
      extends: './tsconfig.json',
      compilerOptions: {
        outDir: './out-tsc/app',
        types: [],
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
    },
    null,
    2,
  ) + '\n',
);

writeFile(
  'src/main.ts',
  "import { bootstrapApplication } from '@angular/platform-browser';\nimport { appConfig } from './app/app.config';\nimport { App } from './app/app';\n\nbootstrapApplication(App, appConfig).catch((err) => console.error(err));\n",
);

writeFile(
  'src/app/app.config.ts',
  "import { ApplicationConfig } from '@angular/core';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [],\n};\n",
);

writeFile(
  'src/app/app.ts',
  "import { Component, signal } from '@angular/core';\nimport { FormControl, ReactiveFormsModule } from '@angular/forms';\nimport { IntlTelInput } from 'angular-intl-tel-input';\n\n@Component({\n  selector: 'app-root',\n  imports: [IntlTelInput, ReactiveFormsModule],\n  template: `\n    <h1>{{ title() }}</h1>\n    <intl-tel-input [initialCountry]=\"'us'\" [formControl]=\"phoneControl\" />\n    <p>Phone value: {{ phoneControl.value }}</p>\n  `,\n  styles: [],\n})\nexport class App {\n  protected readonly title = signal('angular-intl-tel-input integration test');\n  protected readonly phoneControl = new FormControl('');\n}\n",
);

writeFile(
  'src/index.html',
  '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Integration App</title>\n    <base href="/">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n  </head>\n  <body>\n    <app-root></app-root>\n  </body>\n</html>\n',
);

writeFile(
  'src/styles.css',
  '@import "angular-intl-tel-input/styles";\n\n:root { color-scheme: light; }\nbody { font-family: sans-serif; margin: 24px; }\n\nintl-tel-input { width: 320px; display: inline-block; }\n',
);

const run = (command, args) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = process.platform === 'win32'
    ? spawnSync(
      [command, ...args].map(quoteForShell).join(' '),
      {
        cwd: appDir,
        stdio: 'inherit',
        shell: true,
      },
    )
    : spawnSync(command, args, {
      cwd: appDir,
      stdio: 'inherit',
    });

  if (result.error) {
    console.error(result.error);
  }

  if (result.status !== 0) {
    console.error(`\nIntegration validation failed. Temp app preserved at: ${appDir}`);
    process.exit(result.status ?? 1);
  }
};

console.log(`Using built package from: ${distDir}`);
console.log(`Creating integration app in: ${appDir}`);

run('pnpm', ['install']);
run('pnpm', ['run', 'build']);

console.log(`\nIntegration validation passed. Temp app preserved at: ${appDir}`);
