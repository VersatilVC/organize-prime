#!/usr/bin/env node
/**
 * Development Environment Setup Script
 * Ensures proper development environment configuration
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const REQUIRED_FILES = [
  '.env',
  'tsconfig.json',
  'package.json'
];

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

class DevSetup {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  /**
   * Run complete development environment check
   */
  async run() {
    console.log('🔧 OrganizePrime Development Setup');
    console.log('==================================\n');

    this.checkRequiredFiles();
    this.checkEnvironmentVariables();
    this.checkDependencies();
    this.checkTypeScript();
    this.validateBuildConfiguration();
    
    this.displayResults();
    
    if (this.errors.length > 0) {
      console.log('\n❌ Setup incomplete. Please fix the errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ Development environment is ready!');
      console.log('💡 Run "npm run dev" to start the development server');
    }
  }

  /**
   * Check if required configuration files exist
   */
  checkRequiredFiles() {
    console.log('📁 Checking required files...');
    
    REQUIRED_FILES.forEach(file => {
      if (existsSync(file)) {
        this.info.push(`✅ Found ${file}`);
      } else {
        this.errors.push(`❌ Missing required file: ${file}`);
        
        // Provide helpful suggestions
        if (file === '.env') {
          this.info.push('💡 Copy .env.example to .env and configure your Supabase credentials');
        }
      }
    });
  }

  /**
   * Validate environment variables
   */
  checkEnvironmentVariables() {
    console.log('\n🌍 Checking environment variables...');
    
    if (!existsSync('.env')) {
      this.errors.push('❌ .env file not found - cannot validate environment variables');
      return;
    }

    try {
      const envContent = readFileSync('.env', 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      });

      REQUIRED_ENV_VARS.forEach(varName => {
        if (envVars[varName] && envVars[varName] !== '') {
          this.info.push(`✅ ${varName} is configured`);
        } else {
          this.errors.push(`❌ Missing or empty environment variable: ${varName}`);
        }
      });

      // Check for placeholder values
      Object.entries(envVars).forEach(([key, value]) => {
        if (value.includes('your-') || value.includes('placeholder')) {
          this.warnings.push(`⚠️ ${key} appears to contain placeholder value: ${value}`);
        }
      });

    } catch (error) {
      this.errors.push(`❌ Error reading .env file: ${error.message}`);
    }
  }

  /**
   * Check if dependencies are properly installed
   */
  checkDependencies() {
    console.log('\n📦 Checking dependencies...');
    
    try {
      // Check if node_modules exists
      if (!existsSync('node_modules')) {
        this.errors.push('❌ node_modules not found - run "npm install"');
        return;
      }

      // Check critical dependencies
      const criticalDeps = [
        'react',
        'react-dom',
        'vite',
        '@supabase/supabase-js',
        'typescript'
      ];

      criticalDeps.forEach(dep => {
        const depPath = join('node_modules', dep);
        if (existsSync(depPath)) {
          this.info.push(`✅ ${dep} installed`);
        } else {
          this.errors.push(`❌ Critical dependency missing: ${dep}`);
        }
      });

      // Check for potential version conflicts
      this.checkVersionConflicts();

    } catch (error) {
      this.errors.push(`❌ Error checking dependencies: ${error.message}`);
    }
  }

  /**
   * Check for version conflicts
   */
  checkVersionConflicts() {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for React version consistency
      const reactVersion = deps.react;
      const reactDomVersion = deps['react-dom'];
      
      if (reactVersion && reactDomVersion && reactVersion !== reactDomVersion) {
        this.warnings.push(`⚠️ React version mismatch: react@${reactVersion} vs react-dom@${reactDomVersion}`);
      }

      // Check TypeScript version
      const tsVersion = deps.typescript;
      if (tsVersion && tsVersion.startsWith('^4.')) {
        this.warnings.push('⚠️ Consider upgrading to TypeScript 5.x for better performance');
      }

    } catch (error) {
      this.warnings.push(`⚠️ Could not check version conflicts: ${error.message}`);
    }
  }

  /**
   * Validate TypeScript configuration
   */
  checkTypeScript() {
    console.log('\n🔷 Checking TypeScript configuration...');
    
    try {
      // Check if TypeScript can compile
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
      this.info.push('✅ TypeScript compilation successful');
      
    } catch (error) {
      const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
      
      if (errorOutput.includes('error TS')) {
        const errorCount = (errorOutput.match(/error TS/g) || []).length;
        this.errors.push(`❌ TypeScript errors found: ${errorCount} errors`);
        this.info.push('💡 Run "npm run type-check" for detailed error information');
      } else {
        this.warnings.push('⚠️ Could not verify TypeScript compilation');
      }
    }
  }

  /**
   * Validate build configuration
   */
  validateBuildConfiguration() {
    console.log('\n🔨 Validating build configuration...');
    
    try {
      // Check if Vite config exists and is valid
      if (existsSync('vite.config.ts')) {
        this.info.push('✅ Vite configuration found');
        
        // Try to validate config syntax
        try {
          execSync('npx vite build --dry-run', { stdio: 'pipe' });
          this.info.push('✅ Vite configuration is valid');
        } catch (error) {
          this.warnings.push('⚠️ Vite configuration may have issues');
        }
      } else {
        this.errors.push('❌ vite.config.ts not found');
      }

      // Check if build scripts are available
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      ['build', 'dev', 'lint', 'type-check'].forEach(script => {
        if (scripts[script]) {
          this.info.push(`✅ Script "${script}" available`);
        } else {
          this.warnings.push(`⚠️ Script "${script}" not found`);
        }
      });

    } catch (error) {
      this.warnings.push(`⚠️ Could not validate build configuration: ${error.message}`);
    }
  }

  /**
   * Display all results
   */
  displayResults() {
    console.log('\n📊 Setup Results:');
    console.log('==================');
    
    if (this.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.errors.forEach(error => console.log(error));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(warning));
    }
    
    if (this.info.length > 0) {
      console.log('\n✅ Status:');
      this.info.forEach(info => console.log(info));
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new DevSetup();
  setup.run().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

export { DevSetup };