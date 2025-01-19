import {
  Accessory,
  Bridge,
  Categories,
  Characteristic,
  CharacteristicValue,
  HAPStorage,
  Perms,
  Service,
  uuid,
} from 'hap-nodejs';

import { hapStoragePath } from '../../app/environment.js';
import { AnyObservable, AnyWritableObservable } from '../observable.js';
import { objectKeys } from '../oop.js';
import { TCharacteristicKey, TServiceKey } from './types.js';

export type TCharacteristic =
  | {
      get: AnyObservable<CharacteristicValue | null>;
      set?: AnyWritableObservable<CharacteristicValue | null>;
    }
  | {
      value: CharacteristicValue;
    };

export type TService = {
  characteristics: Partial<Record<TCharacteristicKey, TCharacteristic>>;
  optionalCharacteristics?: Partial<
    Record<TCharacteristicKey, TCharacteristic>
  >;
  service: TServiceKey;
  subType?: string;
};

export type TAccessory = {
  displayName: string;
  id: string;
  services: TService[];
};

HAPStorage.setCustomStoragePath(hapStoragePath);

const HAP_ROOT_ID = 'iot-monolith.wurstsalat';

export class HAP {
  private static _addMeta(accessory: Accessory) {
    accessory
      .getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, '@mrpelz')
      .setCharacteristic(Characteristic.SerialNumber, '0000')
      .setCharacteristic(Characteristic.Model, 'iot-monolith')
      .setCharacteristic(Characteristic.FirmwareRevision, '0.0.0');
  }

  private readonly _bridge = new Bridge(
    'iot-monolith Bridge',
    uuid.generate(HAP_ROOT_ID),
  );

  constructor() {
    HAP._addMeta(this._bridge);
  }

  private _setCharacteristic(
    characteristicKey: TCharacteristicKey,
    options: TCharacteristic,
  ) {
    const characteristic = new Characteristic[characteristicKey]();

    if ('get' in options) {
      const { get, set } = options;

      const { perms } = characteristic.props;

      if (perms.includes(Perms.PAIRED_READ) && get.value !== null) {
        characteristic.onGet(() => get.value);
      }

      if (perms.includes(Perms.NOTIFY)) {
        get.observe((value) => {
          if (value === null) return;

          characteristic.sendEventNotification(value);
        });
      }

      if (perms.includes(Perms.PAIRED_WRITE) && set) {
        characteristic.onSet((value) => {
          set.value = value;
        });
      }
    } else if ('value' in options) {
      characteristic.value = options.value;
    }

    return characteristic;
  }

  addAccessory({ displayName, id, services }: TAccessory): void {
    const accessory = new Accessory(
      displayName,
      uuid.generate(`${HAP_ROOT_ID}.${id}`),
    );

    HAP._addMeta(accessory);

    for (const {
      characteristics,
      optionalCharacteristics,
      service: serviceKey,
      subType,
    } of services) {
      const serviceClass = Service[serviceKey];
      const service = new Service(undefined, serviceClass.UUID, subType);

      for (const characteristicKey of objectKeys(characteristics)) {
        const options = characteristics[characteristicKey];
        if (!options) continue;

        service.addCharacteristic(
          this._setCharacteristic(characteristicKey, options),
        );
      }

      if (optionalCharacteristics) {
        for (const characteristicKey of objectKeys(optionalCharacteristics)) {
          const options = characteristics[characteristicKey];
          if (!options) continue;

          service.addOptionalCharacteristic(
            this._setCharacteristic(characteristicKey, options),
          );
        }
      }

      accessory.addService(service);
    }

    this._bridge.addBridgedAccessory(accessory);
  }

  publish(): void {
    this._bridge.publish({
      category: Categories.BRIDGE,
      pincode: '446-88-123',
      port: 47_128,
      username: '02-9c-8f-43-d6-a9',
    });
  }
}
