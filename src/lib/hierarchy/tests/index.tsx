/* eslint-disable no-invalid-this,func-names */
import { Content, Node, Property } from '../index.js';

const tree = new Node(
  new Property('root'),
  new Node(
    new Property('home', 'wursthome'),
    new Node(
      new Property('floor', 'main'),
      new Node(
        new Property('room', 'hallway'),
        new Node(
          new Property('place', 'entryDoor'),
          new Node<string>(
            new Property('item', 'entryDoorOpen'),
            new Property('sensor'),
            new Property('binary-sensor'),
            new Property('door-sensor'),
            new Property('door-sensor-open'),
            new Property('security-relevant'),
            new Property('entry-door'),
            new Content('thisIsTheTestContentFor:entryDoorOpen')
          ),
          new Node<string>(
            new Property('item', 'entryDoorLocked'),
            new Property('sensor'),
            new Property('binary-sensor'),
            new Property('door-sensor'),
            new Property('door-sensor-locked'),
            new Property('security-relevant'),
            new Property('entry-door'),
            new Content('thisIsTheTestContentFor:entryDoorLocked')
          )
        ),
        new Node(
          new Property('place', 'ceiling'),
          new Node<string>(
            new Property('item', 'ceilingLightFront'),
            new Property('light'),
            new Property('binary-light'),
            new Property('secondary'),
            new Property('entry-door'),
            new Content('thisIsTheTestContentFor:ceilingLightFront')
          ),
          new Node<string>(
            new Property('item', 'ceilingLightBack'),
            new Property('light'),
            new Property('binary-light'),
            new Property('primary'),
            new Content('thisIsTheTestContentFor:ceilingLightBack')
          )
        )
      )
    )
  )
);

// eslint-disable-next-line no-console
console.log(tree.matches(new Property('root'), new Property('notSet')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(new Property('security-relevant')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(new Property('room')));

// eslint-disable-next-line no-console
console.log(tree.matchChildren.allNodes(new Property('place')));

// eslint-disable-next-line no-console
console.log(
  tree.matchChildren
    .firstNode(new Property('item', 'ceilingLightBack'))
    ?.matchParents.firstNode(new Property('room'))
);
