import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import { cb, h, prop, tag } from '../index.js';
import { Schedule } from '../../schedule/index.js';

function EntryDoorOpen(props: { name: string }) {
  return (
    <item
      name={props.name}
      sensor
      binary-sensor
      door-sensor
      door-sensor-open
      security-relevant
      entry-door
    ></item>
  );
}

const tree = (
  <root>
    <home name="wursthome">
      <floor name="main" friendlyName="Hauptgeschoss">
        <room name="hallway" friendlyName="Flur">
          <section name="entryDoor">
            <EntryDoorOpen name="entryDoorOpen" />
            <item
              name="entryDoorLocked"
              sensor
              binary-sensor
              door-sensor
              door-sensor-locked
              security-relevant
              entry-door
            ></item>
          </section>
          <section name="ceiling" friendlyName="Decke">
            <item
              name="ceilingLightFront"
              friendlyName="Lampe (vorn)"
              light
              binary-light
              secondary
              entry-door
            ></item>
            <item name="ceilingLightBack" light binary-light primary entry-door>
              {cb((node) => {
                const schedule = new Schedule(
                  () => new ModifiableDate().ceil(Unit.SECOND, 10).date
                );

                let on = false;

                schedule.addTask(() => {
                  on = !on;
                  node[on ? 'add' : 'remove'](prop('on'));
                });

                node.matchObserve(prop('on')).observe((isOn) =>
                  // eslint-disable-next-line no-console
                  console.log(`it's ${isOn ? 'inner on' : 'inner off'}`)
                );
              })}
            </item>
          </section>
        </room>
      </floor>
    </home>
  </root>
);

// eslint-disable-next-line no-console
console.log(tree.matches(tag('root'), prop('notSet')));

// eslint-disable-next-line no-console
console.log(
  [...tree.matchChildren.allNodes(prop('security-relevant'))].map((node) =>
    node.toObject()
  )
);

// eslint-disable-next-line no-console
console.log(
  [...tree.matchChildren.allNodes(tag('room'))].map((node) => node.toObject())
);

// eslint-disable-next-line no-console
console.log(
  [...tree.matchChildren.allNodes(tag('section'))].map((node) =>
    node.toObject()
  )
);

// eslint-disable-next-line no-console
console.log(
  tree.matchChildren
    .firstNode(prop('name', 'ceilingLightBack'))
    ?.matchParents.firstNode(tag('floor'))
    ?.toObject()
);

// eslint-disable-next-line no-console
console.log(
  tree.matchChildren
    .firstNode(prop('name', 'ceilingLightFront'))
    ?.chainOfParentsUntilMatch(tag('room'))
    .reverse()
    .map((node) => node.properties.friendlyName)
    .filter(Boolean)
    .join(' ')
);

tree.matchChildren
  .firstNode(prop('name', 'ceilingLightBack'))
  ?.matchObserve(prop('on'))
  // eslint-disable-next-line no-console
  .observe((on) => console.log(`it's ${on ? 'on' : 'off'}`));
