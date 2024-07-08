function booleanParser(opt) {
  if (opt == true || opt == 'true' || opt == '1') {
    return true;
  }
  return false;
}

export {
  booleanParser,
}
