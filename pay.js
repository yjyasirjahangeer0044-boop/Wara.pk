module.exports = function(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('PayFast API is working. Use POST to make payment.');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    var product_id = req.body.product_id || 'WARA';
    var product_name = req.body.product_name || 'WARA Order';
    var amount = parseFloat(req.body.amount) || 0;

    if (amount <= 0) {
      return res.status(400).send('Invalid amount: ' + req.body.amount);
    }

    var MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '606161';
    var SECURED_KEY = process.env.PAYFAST_SECURED_KEY || '';
    var basketId = product_id + '-' + Date.now();
    var orderDate = new Date().toISOString().slice(0, 10);
    var txnAmt = String(amount);

    var postData = JSON.stringify({
      MERCHANT_ID: MERCHANT_ID,
      SECURED_KEY: SECURED_KEY,
      TXNAMT: txnAmt,
      CURRENCY_CODE: 'PKR',
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
            // Return auto-submit POST form instead of GET redirect
            var html = '<!DOCTYPE html><html><head><title>Redirecting to Payment...</title></head><body>'
              + '<p style="text-align:center;padding:60px;font-family:sans-serif;color:#666;">Redirecting to secure payment page...</p>'
              + '<form id="pf" method="POST" action="https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction">'
              + '<input type="hidden" name="MERCHANT_ID" value="' + MERCHANT_ID + '">'
              + '<input type="hidden" name="TOKEN" value="' + parsed.ACCESS_TOKEN + '">'
              + '<input type="hidden" name="TXNAMT" value="' + txnAmt + '">'
              + '<input type="hidden" name="CURRENCY_CODE" value="PKR">'
              + '<input type="hidden" name="CUSTOMER_MOBILE_NO" value="">'
              + '<input type="hidden" name="CUSTOMER_EMAIL_ADDRESS" value="wara.official.team@gmail.com">'
              + '<input type="hidden" name="SIGNATURE" value="">'
              + '<input type="hidden" name="VERSION" value="2.0">'
              + '<input type="hidden" name="TXNDESC" value="' + product_name.replace(/"/g, '&quot;') + '">'
              + '<input type="hidden" name="PROCCODE" value="00">'
              + '<input type="hidden" name="BASKET_ID" value="' + basketId + '">'
              + '<input type="hidden" name="ORDER_DATE" value="' + orderDate + '">'
              + '<input type="hidden" name="CHECKOUT_URL" value="https://wara.pk">'
              + '<input type="hidden" name="SUCCESS_URL" value="https://wara.pk/?payment=success">'
              + '<input type="hidden" name="FAILURE_URL" value="https://wara.pk/?payment=failed">'
              + '<input type="hidden" name="MERCHANT_NAME" value="WARA Empowering Women">'
              + '</form>'
              + '<script>document.getElementById("pf").submit();</script>'
              + '</body></html>';
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
          } else {
            res.status(500).send('PayFast error: ' + data.substring(0, 300));
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
