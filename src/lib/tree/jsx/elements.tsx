/* eslint-disable comma-spacing */
import { AnyObservable, Observable } from '../../observable.js';
import { Element, h } from './main.js';

export const Getter = <T,>(props: {
  observable: AnyObservable<T>;
}): Element => <element {...{ props }} />;

const tmp = <Getter observable={new Observable(4)} />;
