import { DoorSensor } from '../../lib/door-sensor/index.js';
import { DoorSensorGroup } from '../../lib/group/index.js';
import { HmiElement } from '../../lib/hmi/index.js';
import { getKey } from '../../lib/utils/structures.js';
function createSensor(sensor, server) {
    const { id } = sensor;
    try {
        return new DoorSensor({
            id,
            server
        });
    }
    catch (e) {
        return null;
    }
}
function addPersistenceHandler(name, instance, doorDb) {
    const handleChange = () => {
        doorDb[name] = {
            isOpen: instance.isOpen
        };
    };
    const handleInit = () => {
        const { isOpen = null } = doorDb[name] || {};
        instance.isOpen = isOpen;
        instance.on('change', handleChange);
        handleChange();
    };
    handleInit();
}
function addSecurity(name, instance, alarmLevel, outwards, security) {
    let level = outwards ? 0 : 1;
    if (alarmLevel !== null) {
        level = alarmLevel;
    }
    const trigger = security.addElement(name, level);
    instance.on('change', () => {
        if (instance.isOpen) {
            trigger(true, 'was opened');
            return;
        }
        trigger(false, 'was closed');
    });
}
function createDoorSensors(doorSensors, ev1527Server, doorDb, security) {
    return doorSensors.map((sensor) => {
        const { attributes: { security: { alarmLevel = null, outwards = false } = {} } = {}, disable = false, name, id } = sensor;
        if (disable || !name || !id)
            return null;
        const instance = createSensor(sensor, ev1527Server);
        if (!instance)
            return null;
        instance.log.friendlyName(`${name} (ID: ${id})`);
        addPersistenceHandler(name, instance, doorDb);
        addSecurity(name, instance, alarmLevel, outwards, security);
        return Object.assign(sensor, {
            instance
        });
    }).filter(Boolean);
}
function createOutwardsDoorSensorsGroup(allDoorSensors) {
    const doorSensors = allDoorSensors.filter((sensor) => {
        const { attributes: { security: { outwards = false } = {} } = {} } = sensor;
        return outwards;
    }).map(({ instance }) => {
        return instance;
    });
    try {
        return new DoorSensorGroup(doorSensors);
    }
    catch (e) {
        return null;
    }
}
export function create(config, data) {
    const { 'door-sensors': doorSensorsConfig } = config;
    const { db, ev1527Server, security } = data;
    const doorDb = getKey(db, 'doors');
    const doorSensors = createDoorSensors(doorSensorsConfig, ev1527Server, doorDb, security);
    const outwardsDoorSensorsGroup = createOutwardsDoorSensorsGroup(doorSensors);
    Object.assign(data, {
        doorSensors,
        outwardsDoorSensorsGroup
    });
}
function doorSensorsToPrometheus(doorSensors, prometheus) {
    doorSensors.forEach((sensor) => {
        const { name, instance } = sensor;
        const { push } = prometheus.pushMetric('door', {
            location: name
        });
        push(instance.isOpen);
        instance.on('change', () => {
            push(instance.isOpen);
        });
    });
}
function doorSensorsHmi(doorSensors, hmiServer) {
    doorSensors.forEach((doorSensor) => {
        const { name, instance, attributes: { hmi: hmiAttributes = null } = {} } = doorSensor;
        if (!hmiAttributes)
            return;
        const hmi = new HmiElement({
            name,
            attributes: Object.assign({
                category: 'doors',
                group: 'door',
                subType: 'door',
                type: 'door-sensor'
            }, hmiAttributes),
            server: hmiServer,
            getter: () => {
                return Promise.resolve((() => {
                    if (instance.isOpen)
                        return 'open';
                    if (instance.isOpen === false)
                        return 'close';
                    return 'unknown';
                })());
            }
        });
        instance.on('change', () => {
            hmi.update();
        });
    });
}
function outwardsDoorSensorsGroupHmi(instance, hmiServer) {
    const hmi = new HmiElement({
        name: 'outwardsDoorSensors',
        attributes: {
            category: 'security',
            group: '§{all} §{window}',
            section: 'global',
            sortCategory: '_top',
            sortGroup: 'door',
            subType: 'door',
            type: 'door-sensor'
        },
        server: hmiServer,
        getter: () => {
            return Promise.resolve((() => {
                if (instance.isOpen)
                    return 'open';
                if (instance.isOpen === false)
                    return 'close';
                return 'unknown';
            })());
        }
    });
    instance.on('change', () => {
        hmi.update();
    });
}
export function manage(_, data) {
    const { doorSensors, hmiServer, outwardsDoorSensorsGroup, prometheus } = data;
    doorSensorsToPrometheus(doorSensors, prometheus);
    doorSensorsHmi(doorSensors, hmiServer);
    outwardsDoorSensorsGroupHmi(outwardsDoorSensorsGroup, hmiServer);
}
//# sourceMappingURL=door-sensors.js.map