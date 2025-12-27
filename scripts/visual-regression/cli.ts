#!/usr/bin/env npx tsx
/**
 * 시각적 회귀 테스트 CLI
 *
 * 사용법:
 *   npx tsx scripts/visual-regression/cli.ts --component cap-so-hero-1
 *   npx tsx scripts/visual-regression/cli.ts --all --threshold 0.15
 */
import { compareComponent, ComparisonResult } from './compare';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);

  // --help 플래그 처리
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
시각적 회귀 테스트 CLI

사용법:
  npx tsx scripts/visual-regression/cli.ts --component=<name>  단일 컴포넌트 테스트
  npx tsx scripts/visual-regression/cli.ts --all               모든 컴포넌트 테스트 (처음 10개)
  npx tsx scripts/visual-regression/cli.ts --help              도움말 표시

옵션:
  --component=<name>  테스트할 컴포넌트 이름
  --all               모든 컴포넌트 테스트
  --threshold=<n>     허용 오차 (기본값: 0.1 = 10%)
  -h, --help          도움말 표시

예제:
  npx tsx scripts/visual-regression/cli.ts --component=cap-so-hero-1
  npx tsx scripts/visual-regression/cli.ts --all --threshold=0.15
`);
    return;
  }

  const componentArg = args.find(a => a.startsWith('--component='));
  const allMode = args.includes('--all');
  const thresholdArg = args.find(a => a.startsWith('--threshold='));

  const threshold = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.1;

  const results: ComparisonResult[] = [];

  if (componentArg) {
    const componentName = componentArg.split('=')[1];
    const result = await compareComponent(componentName, { threshold });
    results.push(result);
  } else if (allMode) {
    const registryDir = path.join(process.cwd(), 'src/components/registry');
    const components = fs.readdirSync(registryDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .slice(0, 10); // 처음 10개만 테스트 (데모용)

    for (const name of components) {
      try {
        const result = await compareComponent(name, { threshold });
        results.push(result);
        console.log(`✓ ${name}: ${result.pixelDiffPercent.toFixed(2)}% diff`);
      } catch (err) {
        console.log(`✗ ${name}: ${(err as Error).message}`);
      }
    }
  }

  // 결과 출력
  console.log('\n=== Visual Regression Results ===\n');

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed components:');
    failed.forEach(r => {
      console.log(`  - ${r.componentName}: ${r.pixelDiffPercent.toFixed(2)}% diff (threshold: ${r.threshold * 100}%)`);
    });
  }

  // JSON 리포트 저장
  if (results.length > 0) {
    const outputDir = path.join(process.cwd(), 'visual-regression-output');
    fs.mkdirSync(outputDir, { recursive: true });
    const reportPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(console.error);
