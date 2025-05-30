const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");

const formatOrderToHtml = (order) => {
  const formattedEstimatedArrivalDate = `${order.estimatedArrivalDate.getHours()}:${String(
    order.estimatedArrivalDate.getMinutes()
  ).padStart(2, "0")}`;

  const switchPaymentMethod = (paymentMethod) => {
    switch (paymentMethod) {
      case "cash":
        return "Cash";
        break;
      case "bancontact":
        return "Bancontact";
        break;
      case "online":
        return "Paiement en ligne";
      default:
      // code to be executed if paymentMethod is different from 'method1' and 'method2'
    }
  };

  let html = `
  <div class = "orderData">
  <h3>Détails de la commande</h2>

    <table>
        <tr>
            <th>Quantité</th>
            <th>Article</th>
            <th>Prix</th>
        </tr>
    `;

  order.articles.forEach((article, i) => {
    const options = article.options.filter((option) => !option.isSupplement);
    const supplements = article.options.filter((option) => option.isSupplement);

    const formattedOptions = options.map(
      (option) => `<br>&nbsp;&nbsp;&nbsp;&nbsp;${option.value}`
    );

    const formattedSupplements = supplements.map(
      (supplement) => `<br>&nbsp;&nbsp;+&nbsp;${supplement.value}`
    );

    html += `
        <tr>
            <td>${article.quantity}</td>
            <td><strong>${article.food.value}</strong>
              ${formattedOptions.join("")}
              ${formattedSupplements.join("")}
            </td>
            <td>${article.sum}</td>
        </tr>`;
  });

  html += `
  ${
    order.orderType === 0
      ? `
  <tr>
  <td colspan="2"><strong>Frais de livraison</strong></td>
 
    <td>${order.deliveryFees}</td>
  
</tr>
  `
      : order.orderType === 1
      ? ""
      : ""
  }

    <tr>
        <td colspan="2"><strong>Total</strong></td>
        <td>${order.totalSum}</td>
    </tr>
    </table>
    <p>Note de commande: <span id = 'bolder'> ${
      order.note ? order.note : "Aucune"
    }</span> </p>
    <p>Heure confirmée:  <span id = 'bolder'>${formattedEstimatedArrivalDate}</span> </p>
    <p>Type de commande:  <span id = 'bolder'> ${
      order.orderType === 0
        ? "Livraison"
        : order.orderType === 1
        ? "À emporter"
        : ""
    }</p>
    <p>Moyen de paiement:   <span id = 'bolder'>${switchPaymentMethod(
      order.paymentMethod
    )} </span> </p>`;
  html += `
      </table>
    </div>
    `;
  return html;
};

const formatCustomerDataToHtml = (order) => {
  return `
  <div class="customerData">
    <h3>Coordonnées du client</h3>
    <table>
        <tr>
            <th>Nom:</th>
            <td>${order.customer.lastname} ${order.customer.firstname}</td>
        </tr>
        ${
          //if delivery print the adress
          order.orderType === 0
            ? `
        <tr>
            <th>Adresse:</th>
            <td>${order.customer.address.street} ${order.customer.address.streetNumber}</td>
        </tr>
        <tr>
            <th>Ville:</th>
            <td>${order.customer.address.postCode} ${order.customer.address.city}</td>
        </tr>
        `
            : ""
        }
        <tr>
            <th>Téléphone:</th>
            <td>${order.customer.phoneNumber}</td>
        </tr>
    </table> 
  </div>
  `;
};

const orderCustomerMailHtml = (order, restaurant) => {
  const estimatedArrivalDate = new Date(order.estimatedArrivalDate);
  const formattedEstimatedArrivalDate = `${estimatedArrivalDate.getHours()}:${String(
    estimatedArrivalDate.getMinutes()
  ).padStart(2, "0")}`;
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de commande</title>
    <style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
    }
    .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        line-height: 1.6;
    }
    h1 {
        color: #333;
        margin-top: 0;
    }
    h3 {
        color: #444;
        margin-top: 0;
    }
    p {
        color: #666;
        margin-bottom: 10px;
    }
    .footer {
        margin-top: 20px;
        text-align: center;
        color: #999;
        font-size: 0.8em;
    }
    #bolder {
      font-weight: bolder;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border-radius: 5px;
        overflow: hidden;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    th {
        background-color: #f2f2f2;
    }
    td {
        vertical-align: top;
    }
</style>
</head>
<body>
    <div class = "container"> 
    <div class="intro">
        <h1>Bonjour ${order.customer.firstname} ${order.customer.lastname},</h1>
        <p>Nous tenons à vous remercier pour votre commande !</p>
        <p>Votre commande #<span>${
          order.orderNumber
        }</span> a été traitée avec succès et a été envoyée à <span>${
    restaurant.name
  }</span>.</p>
  <p>
${
  order.orderType === 0
    ? `Elle vous sera livrée aux alentours de ${formattedEstimatedArrivalDate}`
    : order.orderType === 1
    ? `Vous pouvez venir l'emporter aux alentours de  ${formattedEstimatedArrivalDate}`
    : ""
}
</p>
        <p>Si vous avez des questions ou des remarques concernant votre commande, n'hésitez pas à contacter l'établissement directement au <span>${
          restaurant.phoneNumber
        }</span>.</p>
        <p>Merci encore pour votre commande et bon appétit !</p>
    </div>
    ${formatOrderToHtml(order, restaurant)}
    ${formatCustomerDataToHtml(order, restaurant)}
    <div class="footer">
        <p>Cet email a été généré automatiquement. Merci de ne pas y répondre.</p>
    </div>
</body>
</html>
`;
};

const orderRestaurantMailHtml = (order, restaurant) => {
  const estimatedArrivalDate = new Date(order.estimatedArrivalDate);
  const orderCreationDate = new Date(order.creationDate);
  const formattedOrderCreationDate = `${orderCreationDate.getHours()}:${String(
    orderCreationDate.getMinutes()
  ).padStart(2, "0")}`;
  const formattedEstimatedArrivalDate = `${estimatedArrivalDate.getHours()}:${String(
    estimatedArrivalDate.getMinutes()
  ).padStart(2, "0")}`;

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation de commande</title>
      <style>
      body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
      }
      .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          line-height: 1.6;
      }
      h1 {
          color: #333;
          margin-top: 0;
      }
      h3 {
          color: #444;
          margin-top: 0;
      }
      p {
          color: #666;
          margin-bottom: 10px;
      }
      .footer {
          margin-top: 20px;
          text-align: center;
          color: #999;
          font-size: 0.8em;
      }
      #bolder {
        font-weight: bolder;
        color: red;
      }
      table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border-radius: 5px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
      }
      th {
          background-color: #f2f2f2;
      }
      td {
          vertical-align: top;
      }
  </style>
  </head>
  <body>
      <div class = "container"> 
      <div class="intro">
      <h1>${
        order.orderType === 0 ? "LIVRAISON" : "À EMPORTER"
      } pour ${formattedEstimatedArrivalDate}</h1>

</p>
      <p>Si des informations doivent être transmises au client, veuillez l'appeller au <span>${
        order.customer.phoneNumber
      }</span>.</p>
  </div>
  ${formatOrderToHtml(order, restaurant)}
  ${formatCustomerDataToHtml(order, restaurant)}
  <div class="footer">
      <p>Cet email a été généré automatiquement. Merci de ne pas y répondre.</p>
  </div>
  </body>
  </html>
`;
};

/* config for mailgun, we know use mailtrap
const options = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: "foodswip-order.com",
  },
  host: "api.eu.mailgun.net",
};
*/

const transporter = nodemailer.createTransport(
  MailtrapTransport({
    token: process.env.MAILTRAP_API_TOKEN,
  })
);

module.exports = {
  transporter,
  orderRestaurantMailHtml,
  orderCustomerMailHtml,
};
