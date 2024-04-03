function addMoney(...amounts) {
  const totalCents = amounts.reduce(
    (accumulator, amount) => accumulator + amount * 100,
    0
  );
  const total = totalCents / 100;

  return Number(total.toFixed(2));
}

function subtractMoney(...amounts) {
  const totalCents = amounts.reduce(
    (accumlator, amount) => (accumlator - amount) * 100
  );
  const total = totalCents / 100;

  return Number(total.toFixed(2));
}

function multiplyMoney(...amounts) {
  const totalCents = amounts.reduce(
    (accumlator, amount) => accumlator * amount * 100
  );
  const total = totalCents / 100;

  return Number(total.toFixed(2));
}

module.exports = { addMoney, subtractMoney, multiplyMoney };
