/* eslint-disable no-invalid-this,func-names */
import { Property, TagName, h } from '../index.js';

const tree = (
  <root>
    <home name="wursthome">
      <floor name="main">
        <room name="hallway">
          <place name="entryDoor">
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
          </place>
          <place name="ceiling">
            <item
              name="ceilingLightFront"
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
          </place>
        </room>
      </floor>
    </home>
  </root>
);

// eslint-disable-next-line no-console
console.log(tree.matches(new TagName('root'), new Property('notSet')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(new Property('security-relevant')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(new TagName('room')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(new TagName('place')));

// eslint-disable-next-line no-console
console.log(
  tree.matchChildren
    .firstNode(new Property('name', 'ceilingLightBack'))
    ?.matchParents.firstNode(new TagName('room'))
);
