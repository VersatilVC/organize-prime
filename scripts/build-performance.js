/**
 * Build Performance Monitor
 * Tracks build times, bundle sizes, and provides optimization recommendations
 */

import { performance } from 'perf_hooks';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

const PERFORMANCE_LOG_FILE = 'build-performance.json';
const DIST_DIR = 'dist';

/**
 * Measures build performance metrics
 */
export class BuildPerformanceMonitor {
  constructor() {
    this.startTime = performance.now();
    this.metrics = {
      buildTime: 0,
      bundleSize: 0,
      gzipSize: 0,
      chunkCount: 0,
      chunks: [],
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Start timing the build process
   */
  start() {
    this.startTime = performance.now();
    console.log('📊 Build performance monitoring started...');
  }

  /**
   * End timing and calculate metrics
   */
  end() {
    this.metrics.buildTime = Math.round(performance.now() - this.startTime);
    this.analyzeBundles();
    this.saveMetrics();
    this.displayResults();
    this.provideRecommendations();
  }

  /**
   * Analyze bundle sizes and composition
   */
  analyzeBundles() {
    if (!existsSync(DIST_DIR)) {
      console.warn('⚠️ Dist directory not found, skipping bundle analysis');
      return;
    }

    const { readdirSync, statSync } = require('fs');
    const files = readdirSync(DIST_DIR, { recursive: true })
      .filter(file => typeof file === 'string' && file.endsWith('.js'))
      .map(file => {
        const fullPath = join(DIST_DIR, file);
        const stats = statSync(fullPath);
        const content = readFileSync(fullPath);
        const gzipSize = gzipSync(content).length;

        return {
          name: file,
          size: stats.size,
          gzipSize,
          path: fullPath
        };
      });

    this.metrics.chunks = files;
    this.metrics.chunkCount = files.length;
    this.metrics.bundleSize = files.reduce((total, file) => total + file.size, 0);
    this.metrics.gzipSize = files.reduce((total, file) => total + file.gzipSize, 0);
  }

  /**
   * Save metrics to performance log
   */
  saveMetrics() {
    let history = [];
    
    if (existsSync(PERFORMANCE_LOG_FILE)) {
      try {
        const existing = readFileSync(PERFORMANCE_LOG_FILE, 'utf8');
        history = JSON.parse(existing);
      } catch (error) {
        console.warn('⚠️ Could not read existing performance log:', error.message);
      }
    }

    history.push(this.metrics);
    
    // Keep only last 20 builds
    if (history.length > 20) {
      history = history.slice(-20);
    }

    writeFileSync(PERFORMANCE_LOG_FILE, JSON.stringify(history, null, 2));
  }

  /**
   * Display build results
   */
  displayResults() {
    console.log('\n📊 Build Performance Results:');
    console.log('================================');
    console.log(`⏱️  Build Time: ${(this.metrics.buildTime / 1000).toFixed(2)}s`);
    console.log(`📦 Bundle Size: ${this.formatBytes(this.metrics.bundleSize)}`);
    console.log(`🗜️  Gzip Size: ${this.formatBytes(this.metrics.gzipSize)}`);
    console.log(`📄 Chunk Count: ${this.metrics.chunkCount}`);
    
    if (this.metrics.chunks.length > 0) {
      console.log('\n📦 Largest Chunks:');
      const largestChunks = this.metrics.chunks
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);
      
      largestChunks.forEach(chunk => {
        console.log(`   ${chunk.name}: ${this.formatBytes(chunk.size)} (${this.formatBytes(chunk.gzipSize)} gzipped)`);
      });
    }
  }

  /**
   * Provide optimization recommendations
   */
  provideRecommendations() {
    console.log('\n💡 Optimization Recommendations:');
    console.log('==================================');

    // Check build time
    if (this.metrics.buildTime > 30000) {
      console.log('⚠️  Slow build detected (>30s)');
      console.log('   - Consider enabling more aggressive caching');
      console.log('   - Review large dependencies for code splitting opportunities');
    } else if (this.metrics.buildTime < 15000) {
      console.log('✅ Build time is optimal (<15s)');
    }

    // Check bundle size
    const bundleSizeMB = this.metrics.bundleSize / (1024 * 1024);
    if (bundleSizeMB > 5) {
      console.log(`⚠️  Large bundle detected (${bundleSizeMB.toFixed(2)}MB)`);
      console.log('   - Review chunk splitting strategy');
      console.log('   - Consider lazy loading more components');
      console.log('   - Check for duplicate dependencies');
    } else if (bundleSizeMB < 2) {
      console.log('✅ Bundle size is optimal');
    }

    // Check chunk count
    if (this.metrics.chunkCount > 50) {
      console.log(`⚠️  High chunk count (${this.metrics.chunkCount})`);
      console.log('   - Consider consolidating smaller chunks');
      console.log('   - Review dynamic imports strategy');
    } else if (this.metrics.chunkCount < 10) {
      console.log('⚠️  Low chunk count - missing optimization opportunities');
      console.log('   - Consider more aggressive code splitting');
    } else {
      console.log('✅ Chunk count is balanced');
    }

    // Analyze trends if history exists
    this.analyzeTrends();
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends() {
    if (!existsSync(PERFORMANCE_LOG_FILE)) return;

    try {
      const history = JSON.parse(readFileSync(PERFORMANCE_LOG_FILE, 'utf8'));
      if (history.length < 2) return;

      const latest = history[history.length - 1];
      const previous = history[history.length - 2];

      console.log('\n📈 Trend Analysis:');
      console.log('==================');

      const buildTimeDiff = latest.buildTime - previous.buildTime;
      const sizeDiff = latest.bundleSize - previous.bundleSize;

      if (Math.abs(buildTimeDiff) > 2000) {
        const direction = buildTimeDiff > 0 ? 'slower' : 'faster';
        console.log(`⚡ Build is ${Math.abs(buildTimeDiff / 1000).toFixed(1)}s ${direction} than previous build`);
      }

      if (Math.abs(sizeDiff) > 50000) {
        const direction = sizeDiff > 0 ? 'larger' : 'smaller';
        console.log(`📦 Bundle is ${this.formatBytes(Math.abs(sizeDiff))} ${direction} than previous build`);
      }

    } catch (error) {
      console.warn('⚠️ Could not analyze trends:', error.message);
    }
  }

  /**
   * Format bytes for human readable output
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new BuildPerformanceMonitor();
  
  if (process.argv[2] === 'start') {
    monitor.start();
  } else if (process.argv[2] === 'end') {
    monitor.end();
  } else {
    console.log('Usage: node build-performance.js [start|end]');
  }
}