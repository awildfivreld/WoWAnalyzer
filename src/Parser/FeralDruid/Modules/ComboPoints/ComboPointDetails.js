import React from 'react';

import Module from 'Parser/Core/Module';
import Tab from 'Main/Tab';
import StatisticBox, { STATISTIC_ORDER } from 'Main/StatisticBox';

import ComboPointBreakdown from './ComboPointBreakdown';
import ComboPointTracker from './ComboPointTracker';

import WastedPointsIcon from '../Images/feralComboPointIcon.png';

class ComboPointDetails extends Module {
  static dependencies = {
    comboPointTracker: ComboPointTracker,
  };

  suggestions(when) {
    const pointsWasted = this.comboPointTracker.pointsWasted;
    const pointsWastedPerMinute = (pointsWasted / this.owner.fightDuration) * 1000 * 60;
    const MINOR = 5;
    const AVG = 10;
    const MAJOR = 15;
    when(pointsWastedPerMinute).isGreaterThan(MINOR)
      .addSuggestion((suggest, actual, recommended) => {
        return suggest('You are wasting Combo Points. Try to use them and not let them cap and go to waste unless you\'re preparing for bursting adds etc.')
          .icon('creatureportrait_bubble')
          .actual(`${pointsWasted} Combo Points wasted (${pointsWastedPerMinute.toFixed(2)} per minute)`)
          .recommended(`< ${recommended.toFixed(2)} Combo Points per minute wasted are recommended`)
          .regular(AVG).major(MAJOR);
      });
  }

  statistic() {
    const pointsWasted = this.comboPointTracker.pointsWasted;
    return (
      <StatisticBox
        icon={(
          <img
            src={WastedPointsIcon}
            alt="Wasted Combo Points"
          />
        )}
        value={`${pointsWasted}`}
        label="Wasted Combo Points"
      />
    );
  }

  tab() {
    return {
      title: 'Combo Point usage',
      url: 'combo-points',
      render: () => (
        <Tab title="Combo Point usage breakdown">
          <ComboPointBreakdown
            pointsGained={this.comboPointTracker.gained}
            pointsSpent={this.comboPointTracker.spent}
            pointsWasted={this.comboPointTracker.wasted}
          />
        </Tab>
      ),
    };
  }

  statisticOrder = STATISTIC_ORDER.CORE(2);
}

export default ComboPointDetails;
