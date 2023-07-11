import ResourceGraph, { GraphData } from 'parser/shared/modules/ResourceGraph';
import MaelstromTracker from './MaelstromTracker';
import { VisualizationSpec } from 'react-vega';
import { formatTime } from 'parser/ui/BaseChart';
const COLORS = {
  MAELSTROM_FILL: 'rgba(0, 139, 215, 0.2)',
  MAELSTROM_BORDER: 'rgba(0, 145, 255, 1)',
  WASTED_MAELSTROM_FILL: 'rgba(255, 20, 147, 0.3)',
  WASTED_MAELSTROM_BORDER: 'rgba(255, 90, 160, 1)',
};

class MaelstromGraph extends ResourceGraph {
  static dependencies = {
    ...ResourceGraph.dependencies,
    maelstromTracker: MaelstromTracker,
  };

  maelstromTracker!: MaelstromTracker;

  tracker() {
    return this.maelstromTracker;
  }

  get graphData() {
    const graphData: GraphData[] = [];
    const tracker = this.tracker();
    const scaleFactor = this.scaleFactor();

    let sumWasted = 0;

    tracker.resourceUpdates.forEach((u) => {
      if (u.change !== 0) {
        graphData.push({
          kind: 'Maelstrom',
          timestamp: u.timestamp,
          amount: (u.current - (u.change || 0)) * scaleFactor,
        });
      }
      graphData.push({
        kind: 'Maelstrom',
        timestamp: u.timestamp,
        amount: u.current * scaleFactor,
      });
      sumWasted += u.changeWaste || 0;
      graphData.push({
        kind: 'Total wasted maelstrom',
        timestamp: u.timestamp,
        amount: sumWasted * scaleFactor,
      });
    });

    return { graphData };
  }

  get vegaSpec(): VisualizationSpec {
    return {
      data: {
        name: 'graphData',
      },
      transform: [
        {
          filter: 'isValid(datum.timestamp)',
        },
        {
          calculate: `datum.timestamp - ${this.owner.fight.start_time}`,
          as: 'timestamp_shifted',
        },
      ],
      encoding: {
        x: {
          field: 'timestamp_shifted',
          type: 'quantitative' as const,
          axis: {
            labelExpr: formatTime('datum.value'),
            tickCount: 25,
            grid: false,
          },
          scale: {
            nice: false,
          },
          title: 'Time',
        },
        y: {
          field: 'amount',
          type: 'quantitative' as const,
          axis: {
            grid: true,
          },
          title: 'Maelstrom',
        },
        color: {
          field: 'kind',
          type: 'nominal' as const,
          title: null,
          legend: {
            orient: 'top',
          },
          scale: {
            domain: ['Maelstrom', 'Total wasted maelstrom'],
            range: [COLORS.MAELSTROM_FILL, COLORS.WASTED_MAELSTROM_BORDER],
          },
        },
        stroke: {
          field: 'kind',
          type: 'nominal' as const,
          title: null,
          legend: {
            orient: 'top',
          },
          scale: {
            domain: ['Maelstrom', 'Total wasted maelstrom'],
            range: [COLORS.MAELSTROM_BORDER, COLORS.WASTED_MAELSTROM_BORDER],
          },
        },
      },
      resolve: {
        scale: { y: 'independent' as const },
      },
      mark: {
        type: 'line' as const,
        color: this.lineColor(),
        tooltip: true,
      },
      config: {
        view: {},
      },
    };
  }

  // plot included in Guide
}

export default MaelstromGraph;
