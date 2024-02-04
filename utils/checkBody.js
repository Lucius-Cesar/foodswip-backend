function checkBody(body, keys) {
  let isValid = true;

  for (const field of keys) {
    if (!body.hasOwnProperty(field)) {
      isValid = false;
      console.log(field);
      console.log(body[field]);
    }
  }

  return isValid;
}

module.exports = checkBody;
