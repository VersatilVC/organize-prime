#!/usr/bin/env node
/**
 * Advanced Build Optimization Script
 * Implements tree shaking analysis, dependency optimization, and bundle size analysis
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

class BuildOptimizer {
  constructor() {
    this.analysis = {
      unusedExports: [],
      heavyDependencies: [],
      duplicateDependencies: [],
      optimizationOpportunities: [],
      bundleAnalysis: null
    };
  }

  async optimize() {
    console.log('🚀 Advanced Build Optimization');
    console.log('===============================\n');

    try {
      this.analyzeSourceCode();
      this.analyzeDependencies();
      this.analyzeBundle();
      this.generateOptimizationReport();
      this.applyAutomaticOptimizations();
      
      console.log('\n✅ Build optimization completed!');
      console.log('📊 Check optimization-report.json for detailed analysis');
      
    } catch (error) {
      console.error('❌ Optimization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze source code for unused exports and imports
   */
  analyzeSourceCode() {
    console.log('🔍 Analyzing source code...');
    
    const sourceFiles = this.getSourceFiles('src');
    const exports = new Map();
    const imports = new Map();
    
    sourceFiles.forEach(file => {
      try {
        const content = readFileSync(file, 'utf8');
        
        // Find exports
        const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)\s+(\w+)/g);
        for (const match of exportMatches) {
          const exportName = match[1];
          if (!exports.has(exportName)) {
            exports.set(exportName, []);
          }
          exports.get(exportName).push(file);
        }
        
        // Find imports
        const importMatches = content.matchAll(/import\s+.*?from\s+['"`](.+?)['"`]/g);
        for (const match of importMatches) {
          const importPath = match[1];
          if (!imports.has(importPath)) {
            imports.set(importPath, []);
          }
          imports.get(importPath).push(file);
        }
        
      } catch (error) {
        console.warn(`⚠️ Could not analyze file ${file}: ${error.message}`);
      }
    });

    // Find potentially unused exports
    exports.forEach((files, exportName) => {
      const usageCount = Array.from(imports.values()).flat()
        .filter(file => {
          const content = readFileSync(file, 'utf8');
          return content.includes(exportName);
        }).length;
        
      if (usageCount === 0 && !exportName.startsWith('use') && exportName !== 'default') {
        this.analysis.unusedExports.push({
          name: exportName,
          files: files,
          suggestion: 'Consider removing if truly unused'
        });
      }
    });

    console.log(`   Found ${this.analysis.unusedExports.length} potentially unused exports`);
  }

  /**
   * Analyze dependencies for size and usage
   */
  analyzeDependencies() {
    console.log('📦 Analyzing dependencies...');
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Analyze each dependency
      Object.entries(dependencies).forEach(([name, version]) => {
        try {
          const packagePath = join('node_modules', name, 'package.json');
          if (existsSync(packagePath)) {
            const depPackageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
            const size = this.getDirectorySize(join('node_modules', name));
            
            if (size > 5 * 1024 * 1024) { // > 5MB
              this.analysis.heavyDependencies.push({
                name,
                version,
                size: this.formatBytes(size),
                description: depPackageJson.description || 'No description',
                suggestion: 'Consider if this large dependency is necessary'
              });
            }
          }
        } catch (error) {
          // Ignore errors for individual packages
        }
      });

      // Check for duplicate dependencies
      this.findDuplicateDependencies();
      
      console.log(`   Found ${this.analysis.heavyDependencies.length} heavy dependencies`);
      console.log(`   Found ${this.analysis.duplicateDependencies.length} potential duplicates`);
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze dependencies: ${error.message}`);
    }
  }

  /**
   * Find duplicate dependencies in the dependency tree
   */
  findDuplicateDependencies() {
    try {
      const result = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
      const npmLs = JSON.parse(result);
      
      // This is a simplified check - in a real implementation,
      // you'd want to analyze the full dependency tree
      const deps = Object.keys(npmLs.dependencies || {});
      const duplicates = deps.filter(dep => 
        deps.filter(d => d.startsWith(dep.split('-')[0])).length > 1
      );
      
      duplicates.forEach(dep => {
        this.analysis.duplicateDependencies.push({
          name: dep,
          suggestion: 'Check if multiple versions are installed'
        });
      });
      
    } catch (error) {
      console.warn('⚠️ Could not check for duplicate dependencies');
    }
  }

  /**
   * Analyze bundle if it exists
   */
  analyzeBundle() {
    console.log('📊 Analyzing bundle...');
    
    if (!existsSync('dist')) {
      console.warn('⚠️ No dist folder found. Run build first.');
      return;
    }

    const bundleFiles = this.getJSFiles('dist');
    let totalSize = 0;
    const files = [];

    bundleFiles.forEach(file => {
      const stats = statSync(file);
      const size = stats.size;
      totalSize += size;
      
      files.push({
        name: relative('dist', file),
        size: this.formatBytes(size),
        rawSize: size
      });
    });

    this.analysis.bundleAnalysis = {
      totalSize: this.formatBytes(totalSize),
      rawTotalSize: totalSize,
      fileCount: files.length,
      files: files.sort((a, b) => b.rawSize - a.rawSize)
    };

    // Generate optimization opportunities
    if (totalSize > 2 * 1024 * 1024) { // > 2MB
      this.analysis.optimizationOpportunities.push({
        type: 'large_bundle',
        message: `Bundle size is ${this.formatBytes(totalSize)}. Consider code splitting.`,
        priority: 'high'
      });
    }

    const largeFiles = files.filter(f => f.rawSize > 500 * 1024); // > 500KB
    if (largeFiles.length > 0) {
      this.analysis.optimizationOpportunities.push({
        type: 'large_chunks',
        message: `${largeFiles.length} chunks are larger than 500KB`,
        files: largeFiles.map(f => f.name),
        priority: 'medium'
      });
    }

    console.log(`   Bundle size: ${this.formatBytes(totalSize)}`);
    console.log(`   Files: ${files.length}`);
  }

  /**
   * Generate comprehensive optimization report
   */
  generateOptimizationReport() {
    console.log('📋 Generating optimization report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        unusedExportsCount: this.analysis.unusedExports.length,
        heavyDependenciesCount: this.analysis.heavyDependencies.length,
        duplicateDependenciesCount: this.analysis.duplicateDependencies.length,
        optimizationOpportunitiesCount: this.analysis.optimizationOpportunities.length,
        bundleSize: this.analysis.bundleAnalysis?.totalSize || 'Unknown'
      },
      details: this.analysis,
      recommendations: this.generateRecommendations()
    };

    writeFileSync('optimization-report.json', JSON.stringify(report, null, 2));
    console.log('   Report saved to optimization-report.json');
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Bundle size recommendations
    if (this.analysis.bundleAnalysis?.rawTotalSize > 2 * 1024 * 1024) {
      recommendations.push({
        category: 'Bundle Size',
        priority: 'High',
        action: 'Implement aggressive code splitting',
        details: 'Consider using React.lazy() for route-based code splitting'
      });
    }

    // Dependency recommendations
    if (this.analysis.heavyDependencies.length > 3) {
      recommendations.push({
        category: 'Dependencies',
        priority: 'Medium',
        action: 'Review heavy dependencies',
        details: 'Consider lighter alternatives or lazy loading for large libraries'
      });
    }

    // Code quality recommendations
    if (this.analysis.unusedExports.length > 10) {
      recommendations.push({
        category: 'Code Quality',
        priority: 'Low',
        action: 'Clean up unused exports',
        details: 'Remove unused exports to improve tree shaking effectiveness'
      });
    }

    return recommendations;
  }

  /**
   * Apply automatic optimizations where safe
   */
  applyAutomaticOptimizations() {
    console.log('🔧 Applying automatic optimizations...');
    
    // Create optimized Vite config if beneficial
    if (this.analysis.bundleAnalysis?.rawTotalSize > 1024 * 1024) {
      this.generateOptimizedViteConfig();
    }

    // Generate bundle analysis script
    this.generateBundleAnalysisScript();
    
    console.log('   Automatic optimizations applied');
  }

  /**
   * Generate optimized Vite configuration
   */
  generateOptimizedViteConfig() {
    const optimizedConfig = `
// Auto-generated optimized Vite configuration
// Based on bundle analysis from ${new Date().toISOString()}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => ({
  // ... existing config ...
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Optimized chunking based on analysis
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: [${this.analysis.heavyDependencies
            .filter(dep => dep.name.includes('ui') || dep.name.includes('radix'))
            .map(dep => `'${dep.name}'`)
            .join(', ')}],
          utils: ['lodash', 'date-fns', 'zod']
        }
      }
    },
    // Aggressive tree shaking
    treeshake: {
      preset: 'recommended',
      moduleSideEffects: false
    }
  }
}));
`;

    writeFileSync('vite.config.optimized.ts', optimizedConfig);
    console.log('   Generated vite.config.optimized.ts');
  }

  /**
   * Generate bundle analysis script
   */
  generateBundleAnalysisScript() {
    const analysisScript = `
// Bundle Analysis Helper
// Run this after build to get detailed bundle information

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const analyzeBundleSize = () => {
  const distFiles = readdirSync('dist', { recursive: true })
    .filter(file => typeof file === 'string' && file.endsWith('.js'))
    .map(file => {
      const fullPath = join('dist', file);
      const stats = statSync(fullPath);
      return {
        name: file,
        size: stats.size,
        sizeFormatted: (stats.size / 1024).toFixed(2) + ' KB'
      };
    })
    .sort((a, b) => b.size - a.size);

  console.table(distFiles);
  const totalSize = distFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(\`Total bundle size: \${(totalSize / 1024 / 1024).toFixed(2)} MB\`);
};

analyzeBundleSize();
`;

    writeFileSync('scripts/analyze-bundle.js', analysisScript);
    console.log('   Generated scripts/analyze-bundle.js');
  }

  /**
   * Helper methods
   */
  getSourceFiles(dir) {
    const files = [];
    const items = readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.')) {
        files.push(...this.getSourceFiles(fullPath));
      } else if (item.isFile() && /\.(ts|tsx|js|jsx)$/.test(item.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  getJSFiles(dir) {
    const files = [];
    const items = readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.getJSFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  getDirectorySize(dir) {
    let size = 0;
    const items = readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        size += this.getDirectorySize(fullPath);
      } else {
        size += statSync(fullPath).size;
      }
    }
    
    return size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new BuildOptimizer();
  optimizer.optimize();
}

export { BuildOptimizer };