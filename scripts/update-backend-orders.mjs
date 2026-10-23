import fs from 'node:fs';

// 1. Create OrderNumGenerator.cs
const generatorContent = `using System;
using System.Security.Cryptography;

namespace Horeca.Helpers
{
    public static class OrderNumGenerator
    {
        private static readonly char[] Letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".ToCharArray();

        public static string Generate(DateTime? date = null)
        {
            var targetDate = date ?? DateTime.UtcNow;
            var letters = new char[3];
            for (int i = 0; i < 3; i++)
            {
                letters[i] = Letters[RandomNumberGenerator.GetInt32(Letters.Length)];
            }

            var timePart = targetDate.ToString("ddMMyyHHmm");
            return $"{new string(letters)}-{timePart}";
        }
    }
}
`;
fs.writeFileSync('C:/Src/synco-app/Horeca/Horeca/Helpers/OrderNumGenerator.cs', generatorContent, 'utf8');
console.log('1. OrderNumGenerator.cs written');

// 2. OrderCreateResponse.cs
const createRespPath = 'C:/Src/synco-app/Horeca/Horeca/DTOs/OrderCreateResponse.cs';
let createResp = fs.readFileSync(createRespPath, 'utf8');
if (!createResp.includes('OrderNum')) {
  createResp = createResp.replace('public string OrderId { get; set; } = null!;', 'public string OrderId { get; set; } = null!;\n    public string? OrderNum { get; set; }');
  fs.writeFileSync(createRespPath, createResp, 'utf8');
  console.log('2. OrderCreateResponse.cs updated with OrderNum');
} else {
  console.log('2. OrderCreateResponse.cs already contains OrderNum');
}

// 3. OrderSummaryResponse.cs
const summaryRespPath = 'C:/Src/synco-app/Horeca/Horeca/DTOs/OrderSummaryResponse.cs';
let summaryResp = fs.readFileSync(summaryRespPath, 'utf8');
if (!summaryResp.includes('public string? OrderNum { get; set; }')) {
  summaryResp = summaryResp.replace('public string OrderId { get; set; } = null!;', 'public string OrderId { get; set; } = null!;\n        public string? OrderNum { get; set; }');
  fs.writeFileSync(summaryRespPath, summaryResp, 'utf8');
  console.log('3. OrderSummaryResponse.cs updated with OrderNum');
} else {
  console.log('3. OrderSummaryResponse.cs already contains OrderNum');
}

// 4. CreateOrderCommand.cs
const createCmdPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Commands/CreateOrder/CreateOrderCommand.cs';
let createCmd = fs.readFileSync(createCmdPath, 'utf8');
if (!createCmd.includes('using Horeca.Helpers;')) {
  createCmd = 'using Horeca.Helpers;\n' + createCmd;
}
if (!createCmd.includes('OrderNum = OrderNumGenerator.Generate(order.CreationDate)')) {
  createCmd = createCmd.replace(
    'Id = Guid.NewGuid().ToString(),',
    'Id = Guid.NewGuid().ToString(),\n                    OrderNum = OrderNumGenerator.Generate(),'
  );
  createCmd = createCmd.replace(
    'OrderId = order.Id,',
    'OrderId = order.Id,\n                    OrderNum = order.OrderNum,'
  );
  fs.writeFileSync(createCmdPath, createCmd, 'utf8');
  console.log('4. CreateOrderCommand.cs updated');
} else {
  console.log('4. CreateOrderCommand.cs already updated');
}

// 5. CreateMultiSupplierOrderCommand.cs
const multiCmdPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Commands/CreateMultiSupplierOrder/CreateMultiSupplierOrderCommand.cs';
let multiCmd = fs.readFileSync(multiCmdPath, 'utf8');
if (!multiCmd.includes('using Horeca.Helpers;')) {
  multiCmd = 'using Horeca.Helpers;\n' + multiCmd;
}
if (!multiCmd.includes('OrderNum = OrderNumGenerator.Generate()')) {
  multiCmd = multiCmd.replace(
    'Id = Guid.NewGuid().ToString(),',
    'Id = Guid.NewGuid().ToString(),\n                        OrderNum = OrderNumGenerator.Generate(),'
  );
  multiCmd = multiCmd.replace(
    'OrderId = order.Id,',
    'OrderId = order.Id,\n                        OrderNum = order.OrderNum,'
  );
  fs.writeFileSync(multiCmdPath, multiCmd, 'utf8');
  console.log('5. CreateMultiSupplierOrderCommand.cs updated');
} else {
  console.log('5. CreateMultiSupplierOrderCommand.cs already updated');
}

// 6. CreatePriceRequestCommand.cs
const priceCmdPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Commands/CreatePriceRequest/CreatePriceRequestCommand.cs';
let priceCmd = fs.readFileSync(priceCmdPath, 'utf8');
if (!priceCmd.includes('OrderNum = OrderNumGenerator.Generate()')) {
  priceCmd = priceCmd.replace(
    'Id = orderId,',
    'Id = orderId,\n                        OrderNum = OrderNumGenerator.Generate(),'
  );
  priceCmd = priceCmd.replace(
    'OrderId = orderId,',
    'OrderId = orderId,\n                        OrderNum = order.OrderNum,'
  );
  fs.writeFileSync(priceCmdPath, priceCmd, 'utf8');
  console.log('6. CreatePriceRequestCommand.cs updated');
} else {
  console.log('6. CreatePriceRequestCommand.cs already updated');
}

// 7. RepeatOrderCommand.cs
const repeatCmdPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Commands/RepeatOrder/RepeatOrderCommand.cs';
let repeatCmd = fs.readFileSync(repeatCmdPath, 'utf8');
if (!repeatCmd.includes('using Horeca.Helpers;')) {
  repeatCmd = 'using Horeca.Helpers;\n' + repeatCmd;
}
if (!repeatCmd.includes('OrderNum = OrderNumGenerator.Generate()')) {
  repeatCmd = repeatCmd.replace(
    'Id = Guid.NewGuid().ToString(),',
    'Id = Guid.NewGuid().ToString(),\n                    OrderNum = OrderNumGenerator.Generate(),'
  );
  fs.writeFileSync(repeatCmdPath, repeatCmd, 'utf8');
  console.log('7. RepeatOrderCommand.cs updated');
} else {
  console.log('7. RepeatOrderCommand.cs already updated');
}

// 8. GetClientOrdersQuery.cs
const clientQueryPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Queries/GetClientOrders/GetClientOrdersQuery.cs';
let clientQuery = fs.readFileSync(clientQueryPath, 'utf8');
if (!clientQuery.includes('OrderNum = o.OrderNum,')) {
  clientQuery = clientQuery.replace(
    'OrderId = o.Id,',
    'OrderId = o.Id,\n                OrderNum = o.OrderNum,'
  );
  fs.writeFileSync(clientQueryPath, clientQuery, 'utf8');
  console.log('8. GetClientOrdersQuery.cs updated');
} else {
  console.log('8. GetClientOrdersQuery.cs already updated');
}

// 9. GetSupplierOrdersQuery.cs
const suppQueryPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Queries/GetSupplierOrders/GetSupplierOrdersQuery.cs';
let suppQuery = fs.readFileSync(suppQueryPath, 'utf8');
if (!suppQuery.includes('OrderNum = o.OrderNum,')) {
  suppQuery = suppQuery.replace(
    'OrderId = o.Id,',
    'OrderId = o.Id,\n                    OrderNum = o.OrderNum,'
  );
}
if (!suppQuery.includes('o.OrderNum.ToLower().Contains(term)')) {
  suppQuery = suppQuery.replace(
    'o.Id.ToLower().Contains(term) ||',
    'o.Id.ToLower().Contains(term) ||\n                    (o.OrderNum != null && o.OrderNum.ToLower().Contains(term)) ||'
  );
}
fs.writeFileSync(suppQueryPath, suppQuery, 'utf8');
console.log('9. GetSupplierOrdersQuery.cs updated');

// 10. GetSupplierOrderByIdQuery.cs
const suppByIdPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Queries/GetSupplierOrderById/GetSupplierOrderByIdQuery.cs';
let suppById = fs.readFileSync(suppByIdPath, 'utf8');
if (!suppById.includes('OrderNum = order.OrderNum,')) {
  suppById = suppById.replace(
    'OrderId = order.Id,',
    'OrderId = order.Id,\n                OrderNum = order.OrderNum,'
  );
}
if (!suppById.includes('o.OrderNum == query.OrderId')) {
  suppById = suppById.replace(
    'o.Id == query.OrderId && o.SuplierId == query.SupplierId',
    '(o.Id == query.OrderId || o.OrderNum == query.OrderId) && o.SuplierId == query.SupplierId'
  );
}
fs.writeFileSync(suppByIdPath, suppById, 'utf8');
console.log('10. GetSupplierOrderByIdQuery.cs updated');

// 11. OrderRoutingService.cs
const routingPath = 'C:/Src/synco-app/Horeca/Horeca/Features/Orders/Services/OrderRoutingService.cs';
let routingContent = fs.readFileSync(routingPath, 'utf8');
routingContent = routingContent.replace(
  'Message = $"New order #{order.Id} received from {clientName}."',
  'Message = $"New order #{order.OrderNum ?? order.Id} received from {clientName}."'
);
routingContent = routingContent.replace(
  'Message = $"Order #{order.Id} has been assigned to you."',
  'Message = $"Order #{order.OrderNum ?? order.Id} has been assigned to you."'
);
routingContent = routingContent.replace(
  'Order #{order.Id} is available for acceptance.',
  'Order #{order.OrderNum ?? order.Id} is available for acceptance.'
);
fs.writeFileSync(routingPath, routingContent, 'utf8');
console.log('11. OrderRoutingService.cs updated');

// 12. OrderPollingWorker.cs
const workerPath = 'C:/Src/synco-app/Horeca/Sinko.Notification/Services/OrderPollingWorker.cs';
let workerContent = fs.readFileSync(workerPath, 'utf8');
workerContent = workerContent.replace(
  'orderId = order.Id,',
  'orderId = order.Id,\n                            orderNum = order.OrderNum,'
);
workerContent = workerContent.replace(
  'message = $"You have a new order #{order.Id}!",',
  'message = $"You have a new order #{order.OrderNum ?? order.Id}!",'
);
fs.writeFileSync(workerPath, workerContent, 'utf8');
console.log('12. OrderPollingWorker.cs updated');

console.log('ALL BACKEND FILES UPDATED!');

