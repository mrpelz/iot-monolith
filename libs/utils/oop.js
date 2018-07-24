function rebind(context, ...names) {
  names.forEach((name) => {
    context[name] = context[name].bind(context);
  });
}

function resolveAlways(promise) {
  return promise.catch(() => {
    return null;
  });
}

module.exports = {
  rebind,
  resolveAlways
};
