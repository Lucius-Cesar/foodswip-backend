const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");

/* 
const order = {
  _id: {
    $oid: "6606b55ee97379ed62b4a628",
  },
  orderNumber: 233281,
  customer: {
    firstname: "Lucius",
    lastname: "grangius",
    mail: "luciendelgrange5@gmail.com",
    phoneNumber: "04980839362",
    address: {
      streetAddress: "8, rue du bout de la haut",
      postCode: "7390",
      city: "Quaregnon",
    },
    ip: "::1",
  },
  articles: [
    {
      value: "Pizza Margherita",
      food: {
        $oid: "66006465fe8ee40efe1afdab",
      },
      quantity: 5,
      selectedOptions: ["Taille S", "Croûte normale"],
      selectedSupplements: ["Olives noires", "Champignons"],
      price: 14.49,
      sum: 72.45,
      foodCategoryIndex: 0,
      _id: {
        $oid: "6606b55ee97379ed62b4a629",
      },
    },
  ],
  articlesSum: 72.45,
  totalSum: 77.45,
  note: "",
  orderType: 0,
  paymentMethod: "cash",
  creationDate: {
    $date: "2024-03-29T12:34:38.175Z",
  },
  lastUpdate: {
    $date: "2024-03-29T12:34:38.175Z",
  },
  estimatedArrivalDate: {
    $date: "2024-03-29T13:34:37.995Z",
  },
  status: "completed",
  statusHistory: [
    {
      status: "completed",
      date: {
        $date: "2024-03-29T12:34:38.175Z",
      },
    },
  ],
  __v: 0,
};

/*

/*
const restaurant = {
  name: "Dodopizza",
  uniqueValue: "dodopizza",
  mail: "restaurant@dodopizza.com",
  phoneNumber: "+32407886655",
  website: "www.dodopizza.com",
  publicSettings: {
    orderTypes: [
      {
        value: 0,
        enabled: true,
      },
      {
        value: 1,
        enabled: true,
      },
    ],
    deliveryEstimate: {
      min: 45,
      max: 60,
    },
    deliveryFees: 5,
    deliveryMin: 20,
    takeAwayEstimate: 15,
    paymentMethods: [
      {
        value: "cash",
        delivery: true,
        takeAway: true,
      },
      {
        value: "bancontact",
        delivery: true,
        takeAway: true,
      },
    ],
    schedule: [
      {
        value: "monday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
      {
        value: "tuesday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
      {
        value: "wednesday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
      {
        value: "thursday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
      {
        value: "friday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
      {
        value: "saturday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
      {
        value: "sunday",
        services: [
          {
            start: "00:00",
            end: "23:59",
          },
        ],
      },
    ],
    exceptionalClosings: [],
  },
  privateSettings: {
    orderMailReception: {
      enabled: false,
      mails: ["test@gmail.com"],
    },
    pendingOrderAlert: {
      enabled: true,
      interval: 5,
    },
  },
};
*/
const formatOrderToHtml = (order, restaurant) => {
  let html = `
  <div class = "orderData">
  <h3>Détails de la commande</h2>

    <table>
        <tr>
            <th>Quantité</th>
            <th>Article</th>
            <th>Description</th>
            <th>Prix</th>
        </tr>
    `;

  order.articles.forEach((article, i) => {
    html += `
        <tr>
            <td>${article.quantity}</td>
            <td>${article.value}</td>
            <td>${article.selectedOptions.join(
              ", "
            )} <br> ${article.selectedSupplements.join(", ")}</td>
            <td>${article.sum}</td>
        </tr>`;
  });

  html += `
  ${
    order.orderType === 0
      ? `
  <tr>
  <td colspan="3"><strong>Frais de livraison</strong></td>
 
    <td>${restaurant.publicSettings.deliveryFees}</td>
  
</tr>
  `
      : order.orderType === 1
      ? ""
      : ""
  }

    <tr>
        <td colspan="3"><strong>Total</strong></td>
        <td>${order.totalSum}</td>
    </tr>
    </table>
    <p><strong>Note de commande:</strong> ${
      order.note ? order.note : "Aucune"
    }</p>
    <p><strong>Type de commande:</strong> ${
      order.orderType === 0
        ? "Livraison"
        : order.orderType === 1
        ? "À emporter"
        : ""
    }</p>
    <p><strong>Moyen de paiement:</strong> ${order.paymentMethod}</p>
    <p><strong>Numéro de commande:</strong> ${order.orderNumber}</p>`;
  html += `
      </table>
    </div>
    `;
  return html;
};

const formatCustomerDataToHtml = (order) => {
  return `
  <div class = "customerData">
    <h3>Coordonnées du client</h2>
    <table>
        <tr>
            <th>Nom:</th>
            <td>${order.customer.lastname} ${order.customer.firstname}</td>
        </tr>
        <tr>
            <th>Adresse:</th>
            <td>${order.customer.address.street} ${order.customer.address.streetNumber}</td>
        </tr>
        <tr>
            <th>Ville:</th>
            <td>${order.customer.address.postCode} ${order.customer.address.city}</td>
        </tr>
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
      <h1>Nouvelle commande passée à ${formattedOrderCreationDate}</h1>
${
  order.orderType === 0
    ? `La commande doit être livrée au plus tard pour ${formattedEstimatedArrivalDate}`
    : order.orderType === 1
    ? `Le client passera l'emporter aux alentours de ${formattedEstimatedArrivalDate}`
    : ""
}
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

const options = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: "foodswip-order.com",
  },
  host: "api.eu.mailgun.net",
};

const transporter = nodemailer.createTransport(mg(options));

module.exports = {
  transporter,
  orderRestaurantMailHtml,
  orderCustomerMailHtml,
};
