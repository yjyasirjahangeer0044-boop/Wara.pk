module.exports = function(req, res) {
  // Handle GET request (browser test)
  if (req.method === 'GET') {
    return res.status(200).send('PayFast API is working. Use POST to make payment.');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    var product_id = req.body.product_id || 'unknown';
    var product_name = req.body.product_name || 'WARA Order';
    var amount = req.body.amount || '0';

    var MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '606161';
    var SECURED_KEY = process.env.PAYFAST_SECURED_KEY || '';
    var basketId = product_id + '-' + Date.now();
    var orderDate = new Date().toISOString().slice(0, 10);
    var txnAmt = String(Math.round(parseFloat(amount) * 100));

    var postData = JSON.stringify({
      MERCHANT_ID: MERCHANT_ID,
      SECURED_KEY: SECURED_KEY,
      TXNAMT: txnAmt,
      BASKET_ID: basketId,
      ORDER_DATE: orderDate,
      TXNDESC: product_name,
      PROCCODE: '00',
      MERCHANT_NAME: 'WARA Empowering Women',
      CUSTOMER_EMAIL_ADDRESS: 'wara.official.team@gmail.com',
      SUCCESS_URL: 'https://wara.pk/?payment=success',
      FAILURE_URL: 'https://wara.pk/?payment=failed',
      CHECKOUT_URL: 'https://wara.pk'
    });

    var https = require('https');
    var options = {
      hostname: 'ipg1.apps.net.pk',
      path: '/Ecommerce/api/Transaction/GetAccessToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    var request = https.request(options, function(response) {
      var data = '';
      response.on('data', function(chunk) { data += chunk; });
      response.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          if (parsed.ACCESS_TOKEN) {
            var url = 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction'
              + '?MERCHANT_ID=' + MERCHANT_ID
              + '&TOKEN=' + parsed.ACCESS_TOKEN
              + '&TXNAMT=' + txnAmt
              + '&CUSTOMER_MOBILE_NO='
              + '&CUSTOMER_EMAIL_ADDRESS=wara.official.team@gmail.com'
              + '&SIGNATURE='
              + '&VERSION=2.0'
              + '&TXNDESC=' + encodeURIComponent(product_name)
              + '&PROCCODE=00'
              + '&BASKET_ID=' + basketId
              + '&ORDER_DATE=' + orderDate
              + '&CHECKOUT_URL=' + encodeURIComponent('https://wara.pk')
              + '&SUCCESS_URL=' + encodeURIComponent('https://wara.pk/?payment=success')
              + '&FAILURE_URL=' + encodeURIComponent('https://wara.pk/?payment=failed')
              + '&MERCHANT_NAME=' + encodeURIComponent('WARA Empowering Women');
            res.writeHead(302, { Location: url });
            res.end();
          } else {
            res.status(500).send('PayFast token error: ' + data.substring(0, 200));
          }
        } catch(e) {
          res.status(500).send('Parse error: ' + e.message);
        }
      });
    });

    request.on('error', function(e) {
      res.status(500).send('Network error: ' + e.message);
    });

    request.write(postData);
    request.end();

  } catch(e) {
    res.status(500).send('Server error: ' + e.message);
  }
};
