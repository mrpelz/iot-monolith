/* eslint-disable no-invalid-this,func-names */
import { h, property, tagName } from '../index.js';

const tree = (
  <root>
    <home name="wursthome">
      <floor name="main" friendlyName="Hauptgeschoss">
        <room name="hallway" friendlyName="Flur">
          <section name="entryDoor">
            <item
              name="entryDoorOpen"
              sensor
              binary-sensor
              door-sensor
              door-sensor-open
              security-relevant
              entry-door
            >
              thisIsTheTestContentFor:entryDoorOpen
            </item>
            <item
              name="entryDoorLocked"
              sensor
              binary-sensor
              door-sensor
              door-sensor-locked
              security-relevant
              entry-door
            >
              thisIsTheTestContentFor:entryDoorLocked
            </item>
          </section>
          <section name="ceiling" friendlyName="Decke">
            <item
              name="ceilingLightFront"
              friendlyName="Lampe (vorn)"
              light
              binary-light
              secondary
              entry-door
            >
              thisIsTheTestContentFor:ceilingLightFront
            </item>
            <item name="ceilingLightBack" light binary-light primary entry-door>
              thisIsTheTestContentFor:ceilingLightFront
            </item>
          </section>
        </room>
      </floor>
    </home>
  </root>
);

// eslint-disable-next-line no-console
console.log(tree.matches(tagName('root'), property('notSet')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(property('security-relevant')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(tagName('room')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(tagName('section')));

// eslint-disable-next-line no-console
console.log(
  tree.matchChildren
    .firstNode(property('name', 'ceilingLightBack'))
    ?.matchParents.firstNode(tagName('floor'))
);

// eslint-disable-next-line no-console
console.log(
  tree.matchChildren
    .firstNode(property('name', 'ceilingLightFront'))
    ?.chainOfParentsUntilMatch(tagName('room'))
    .reverse()
    .map((node) => node.properties.get('friendlyName'))
    .filter(Boolean)
    .join(' ')
);
