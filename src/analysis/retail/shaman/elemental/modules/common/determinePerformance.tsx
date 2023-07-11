import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

export interface PerformanceData {
  perfectPct: number;
  goodPct: number;
  okPct: number;
}

// Probably a better way to do this. Good here might either be 100% or 0%.
export function determinePerformance(
  performancePct: number,
  data: PerformanceData,
): QualitativePerformance {
  if (data.perfectPct > data.okPct) {
    if (performancePct >= data.perfectPct) {
      return QualitativePerformance.Perfect;
    }
    if (performancePct >= data.goodPct) {
      return QualitativePerformance.Good;
    }
    if (performancePct >= data.okPct) {
      return QualitativePerformance.Ok;
    }
    return QualitativePerformance.Fail;
  } else {
    if (performancePct <= data.perfectPct) {
      return QualitativePerformance.Perfect;
    }
    if (performancePct <= data.goodPct) {
      return QualitativePerformance.Good;
    }
    if (performancePct <= data.okPct) {
      return QualitativePerformance.Ok;
    }
    return QualitativePerformance.Fail;
  }
}
