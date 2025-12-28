import { computeRecencyBoost, computeFinalScore, PIN_BOOST, SITE_BOOST } from "./scoring";

/**
 * Minimal test suite for scoring functions
 * Can be run in browser console or with a test runner
 */

function assertEqual(actual: number, expected: number, tolerance: number = 0.001, msg?: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed: ${msg}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertTrue(condition: boolean, msg?: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export function runScoringTests() {
  console.log("Running scoring tests...");

  // Test recency boost
  {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const boost1h = computeRecencyBoost(oneHourAgo);
    const boost1d = computeRecencyBoost(oneDayAgo);
    const boost2w = computeRecencyBoost(twoWeeksAgo);

    // Recent items should have higher boost
    assertTrue(boost1h > boost1d, "1 hour ago should have higher boost than 1 day ago");
    assertTrue(boost1d > boost2w, "1 day ago should have higher boost than 2 weeks ago");

    // 2 weeks ago (tau) should have boost ≈ 1/e ≈ 0.368
    assertEqual(boost2w, 1 / Math.E, 0.01, "2 weeks ago boost should be ≈ 1/e");

    // Undefined should return 0
    assertEqual(computeRecencyBoost(undefined), 0, 0, "undefined lastUsedAt should return 0");
  }

  // Test final score computation
  {
    // Base case: no boosts
    const score1 = computeFinalScore(0.5, 0, false, false);
    assertEqual(score1, 0.5 * 0.8, 0.001, "Base score with sim=0.5, no boosts");

    // With recency boost
    const score2 = computeFinalScore(0.5, 0.5, false, false);
    assertEqual(score2, 0.5 * 0.8 + 0.5 * 0.2, 0.001, "Score with sim=0.5, recency=0.5");

    // With pin boost
    const score3 = computeFinalScore(0.5, 0, true, false);
    assertEqual(score3, 0.5 * 0.8 + PIN_BOOST, 0.001, "Score with sim=0.5, pinned");

    // With site boost
    const score4 = computeFinalScore(0.5, 0, false, true);
    assertEqual(score4, 0.5 * 0.8 + SITE_BOOST, 0.001, "Score with sim=0.5, site match");

    // All boosts
    const score5 = computeFinalScore(1.0, 1.0, true, true);
    assertEqual(
      score5,
      1.0 * 0.8 + 1.0 * 0.2 + PIN_BOOST + SITE_BOOST,
      0.001,
      "Score with all boosts"
    );
  }

  // Test that pinned items get a fixed boost
  {
    assertEqual(PIN_BOOST, 0.15, 0, "PIN_BOOST should be 0.15");
    assertEqual(SITE_BOOST, 0.05, 0, "SITE_BOOST should be 0.05");
  }

  console.log("✓ All scoring tests passed");
}

// Auto-run if in browser environment
if (typeof window !== "undefined") {
  runScoringTests();
}
