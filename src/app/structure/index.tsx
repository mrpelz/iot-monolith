import { TestSensor } from '../instances/test-sensor.js';
import { h } from '../../lib/hierarchy/index.js';

export const root = (
  <root>
    <home name="wursthome">
      <floor name="1_UG">
        <room name="basement"></room>
      </floor>
      <floor name="0">
        <room name="lobby">
          <section name="mailbox"></section>
        </room>
      </floor>
      <floor name="1_OG">
        <section inside>
          <room name="hallway"></room>
          <room name="office">
            <TestSensor
              host="test-device.iot-ng.net.wurstsalat.cloud"
              port={1337}
            />
          </room>
          <room name="bedroom"></room>
          <room name="kitchen"></room>
          <room name="dining"></room>
          <room name="living"></room>
          <room name="storage"></room>
          <room name="shower-bathroom"></room>
          <room name="bathtub-bathroom"></room>
        </section>
        <section outside>
          <room name="balcony"></room>
          <room name="terrace"></room>
        </section>
      </floor>
    </home>
  </root>
);
