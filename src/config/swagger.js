const swaggerJsdoc = require('swagger-jsdoc');

const secured = [{ bearerAuth: [] }];

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Karibu Backend API',
      version: '1.0.0',
      description: 'API documentation for Karibu backend services'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server'
      }
    ],
    tags: [
      { name: 'Health', description: 'Liveness and readiness endpoints' },
      { name: 'Auth', description: 'Authentication and current user session' },
      { name: 'Accounting', description: 'Expenses, credit collections, and other income' },
      { name: 'Procurement', description: 'Stock, suppliers, purchases, and procurement reports' },
      { name: 'Sales', description: 'Sales operations, customers, and payments' },
      { name: 'Report', description: 'Cross-module consolidated reporting' },
      { name: 'Users', description: 'User administration and audit events' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      parameters: {
        idPath: {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'MongoDB document id'
        },
        fromDate: {
          in: 'query',
          name: 'from',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Start date (inclusive) in YYYY-MM-DD format'
        },
        toDate: {
          in: 'query',
          name: 'to',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'End date (inclusive) in YYYY-MM-DD format'
        },
        page: {
          in: 'query',
          name: 'page',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        limit: {
          in: 'query',
          name: 'limit',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        },
        search: {
          in: 'query',
          name: 'search',
          required: false,
          schema: { type: 'string' }
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid request payload or query parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                validationError: {
                  value: { success: false, message: 'title and amount are required' }
                }
              }
            }
          }
        },
        Unauthorized: {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                unauthorized: {
                  value: { success: false, message: 'Unauthorized' }
                }
              }
            }
          }
        },
        Forbidden: {
          description: 'Authenticated but not allowed to perform this action',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                forbidden: {
                  value: { success: false, message: 'Forbidden' }
                }
              }
            }
          }
        },
        NotFound: {
          description: 'Requested resource was not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                notFound: {
                  value: { success: false, message: 'Resource not found' }
                }
              }
            }
          }
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 43 }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65fd72db17fba29fda17bd21' },
            name: { type: 'string', example: 'Admin User' },
            email: { type: 'string', format: 'email', example: 'admin@karibu.app' },
            role: { type: 'string', enum: ['director', 'admin', 'sales-agent', 'manager'], example: 'admin' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'], example: 'maganjo' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        AuthRequestRegister: {
          type: 'object',
          required: ['name', 'email', 'password', 'branch'],
          properties: {
            name: { type: 'string', example: 'Alice N.' },
            email: { type: 'string', format: 'email', example: 'alice@karibu.app' },
            password: { type: 'string', minLength: 6, example: 'StrongPass123' },
            role: { type: 'string', enum: ['director', 'admin', 'sales-agent', 'manager'], example: 'sales-agent' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'], example: 'maganjo' }
          }
        },
        AuthRequestLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@karibu.app' },
            password: { type: 'string', example: 'StrongPass123' }
          }
        },
        AuthData: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          }
        },
        ExpenseInput: {
          type: 'object',
          required: ['title', 'amount'],
          properties: {
            title: { type: 'string', example: 'Electricity Bill' },
            amount: { type: 'number', format: 'double', example: 150000 },
            category: { type: 'string', example: 'Utilities' },
            note: { type: 'string', example: 'Main office meter' },
            expenseDate: { type: 'string', format: 'date-time', example: '2026-03-03T09:00:00.000Z' }
          }
        },
        CreditCollectionInput: {
          type: 'object',
          required: ['customerName', 'amount'],
          properties: {
            customerName: { type: 'string', example: 'John Doe' },
            amount: { type: 'number', format: 'double', example: 85000 },
            paymentMethod: { type: 'string', example: 'mobile-money' },
            reference: { type: 'string', example: 'TXN-9901' },
            collectionDate: { type: 'string', format: 'date-time', example: '2026-03-03T10:30:00.000Z' }
          }
        },
        OtherIncomeInput: {
          type: 'object',
          required: ['source', 'amount'],
          properties: {
            source: { type: 'string', example: 'Commission' },
            amount: { type: 'number', format: 'double', example: 120000 },
            note: { type: 'string', example: 'Partner incentive' },
            incomeDate: { type: 'string', format: 'date-time', example: '2026-03-03T11:00:00.000Z' }
          }
        },
        SaleLineInput: {
          type: 'object',
          required: ['itemId', 'quantity'],
          properties: {
            itemId: { type: 'string', example: '65fd72db17fba29fda17be10' },
            quantity: { type: 'number', example: 2 },
            unitPrice: { type: 'number', format: 'double', example: 35000 }
          }
        },
        CreateCashSaleInput: {
          type: 'object',
          required: ['lines'],
          properties: {
            lines: { type: 'array', items: { $ref: '#/components/schemas/SaleLineInput' } },
            discount: { type: 'number', format: 'double', example: 5000 },
            saleDate: { type: 'string', format: 'date-time', example: '2026-03-04T08:40:00.000Z' },
            note: { type: 'string', example: 'Morning walk-in sale' }
          }
        },
        CreateCreditSaleInput: {
          type: 'object',
          required: ['customerId', 'lines'],
          properties: {
            customerId: { type: 'string', example: '65fd72db17fba29fda17bf90' },
            lines: { type: 'array', items: { $ref: '#/components/schemas/SaleLineInput' } },
            discount: { type: 'number', format: 'double', example: 2000 },
            amountPaid: { type: 'number', format: 'double', example: 10000 },
            saleDate: { type: 'string', format: 'date-time', example: '2026-03-04T09:05:00.000Z' },
            note: { type: 'string', example: 'Customer takes goods on account' }
          }
        },
        CustomerInput: {
          type: 'object',
          required: ['name', 'tel', 'nin'],
          properties: {
            name: { type: 'string', example: 'Jane K' },
            tel: { type: 'string', example: '+256700123456' },
            nin: { type: 'string', example: 'CM12345678ABC' },
            address: { type: 'string', example: 'Kampala' }
          }
        },
        CustomerUpdateInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Jane Kato' },
            tel: { type: 'string', example: '+256700123457' },
            nin: { type: 'string', example: 'CM12345678ABD' },
            address: { type: 'string', example: 'Wakiso' }
          }
        },
        CustomerPaymentInput: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', format: 'double', example: 30000 },
            paymentMethod: { type: 'string', example: 'cash' },
            reference: { type: 'string', example: 'REC-2201' },
            note: { type: 'string', example: 'Partial settlement' },
            paymentDate: { type: 'string', format: 'date-time', example: '2026-03-04T10:00:00.000Z' }
          }
        },
        SupplierInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Nile Distributors Ltd' },
            phone: { type: 'string', example: '+256700009900' },
            email: { type: 'string', format: 'email', example: 'accounts@niledistributors.com' },
            address: { type: 'string', example: 'Plot 8, Ndeeba' },
            openingBalance: { type: 'number', format: 'double', example: 500000 }
          }
        },
        SupplierUpdateInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Nile Distributors' },
            phone: { type: 'string', example: '+256700009901' },
            email: { type: 'string', format: 'email', example: 'ap@niledistributors.com' },
            address: { type: 'string', example: 'Ndeeba, Kampala' }
          }
        },
        SupplierPaymentInput: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', format: 'double', example: 150000 },
            paymentMethod: { type: 'string', example: 'bank' },
            reference: { type: 'string', example: 'BNK-9988' },
            note: { type: 'string', example: 'Weekly supplier repayment' },
            paymentDate: { type: 'string', format: 'date-time', example: '2026-03-04T12:30:00.000Z' }
          }
        },
        PurchaseLineInput: {
          type: 'object',
          required: ['itemId', 'quantity'],
          properties: {
            itemId: { type: 'string', example: '65fd72db17fba29fda17be10' },
            quantity: { type: 'number', example: 40 },
            unitCost: { type: 'number', format: 'double', example: 12000 },
            sellingPrice: { type: 'number', format: 'double', example: 15000 }
          }
        },
        PurchaseInput: {
          type: 'object',
          required: ['supplierId', 'paymentType', 'lines'],
          properties: {
            supplierId: { type: 'string', example: '65fd72db17fba29fda17c090' },
            paymentType: { type: 'string', enum: ['cash', 'credit'], example: 'credit' },
            lines: { type: 'array', items: { $ref: '#/components/schemas/PurchaseLineInput' } },
            discount: { type: 'number', format: 'double', example: 10000 },
            amountPaid: { type: 'number', format: 'double', example: 200000 },
            paymentMethod: { type: 'string', example: 'cash' },
            reference: { type: 'string', example: 'PO-INIT-01' },
            purchaseDate: { type: 'string', format: 'date-time', example: '2026-03-04T11:00:00.000Z' },
            note: { type: 'string', example: 'Restocking beverages' }
          }
        },
        RoleUpdateInput: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['director', 'admin', 'sales-agent', 'manager'], example: 'manager' }
          }
        },
        StandardSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed' },
            data: { type: 'object', additionalProperties: true }
          }
        },
        ExpenseRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            amount: { type: 'number', format: 'double' },
            category: { type: 'string' },
            note: { type: 'string' },
            expenseDate: { type: 'string', format: 'date-time' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CreditCollectionRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            customerName: { type: 'string' },
            amount: { type: 'number', format: 'double' },
            paymentMethod: { type: 'string' },
            reference: { type: 'string' },
            collectionDate: { type: 'string', format: 'date-time' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        OtherIncomeRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            source: { type: 'string' },
            amount: { type: 'number', format: 'double' },
            note: { type: 'string' },
            incomeDate: { type: 'string', format: 'date-time' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        AccountingOverview: {
          type: 'object',
          properties: {
            totalExpenses: { type: 'number', format: 'double' },
            totalCreditCollections: { type: 'number', format: 'double' },
            totalOtherIncome: { type: 'number', format: 'double' },
            netBalance: { type: 'number', format: 'double' },
            counts: {
              type: 'object',
              properties: {
                expenses: { type: 'integer' },
                creditCollections: { type: 'integer' },
                otherIncome: { type: 'integer' }
              }
            }
          }
        },
        InventoryItemRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            sku: { type: 'string' },
            category: { type: 'string' },
            quantityOnHand: { type: 'number' },
            minQty: { type: 'number' },
            unitCost: { type: 'number', format: 'double' },
            sellingPrice: { type: 'number', format: 'double' },
            note: { type: 'string' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SupplierRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            address: { type: 'string' },
            openingBalance: { type: 'number', format: 'double' },
            balance: { type: 'number', format: 'double' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SupplierPaymentRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            supplier: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/SupplierRecord' }] },
            amount: { type: 'number', format: 'double' },
            paymentMethod: { type: 'string' },
            reference: { type: 'string' },
            note: { type: 'string' },
            paymentDate: { type: 'string', format: 'date-time' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SaleLineRecord: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            itemName: { type: 'string' },
            sku: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number', format: 'double' },
            lineTotal: { type: 'number', format: 'double' }
          }
        },
        SaleRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            saleNo: { type: 'string' },
            saleType: { type: 'string', enum: ['cash', 'credit'] },
            customer: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/CustomerRecord' }] },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            customerNin: { type: 'string' },
            lines: { type: 'array', items: { $ref: '#/components/schemas/SaleLineRecord' } },
            subTotal: { type: 'number', format: 'double' },
            discount: { type: 'number', format: 'double' },
            totalAmount: { type: 'number', format: 'double' },
            amountPaid: { type: 'number', format: 'double' },
            balanceDue: { type: 'number', format: 'double' },
            saleDate: { type: 'string', format: 'date-time' },
            note: { type: 'string' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CustomerRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            tel: { type: 'string' },
            nin: { type: 'string' },
            address: { type: 'string' },
            totalCredit: { type: 'number', format: 'double' },
            totalPaid: { type: 'number', format: 'double' },
            accountBalance: { type: 'number', format: 'double' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CustomerPaymentRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            customer: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/CustomerRecord' }] },
            amount: { type: 'number', format: 'double' },
            paymentMethod: { type: 'string' },
            reference: { type: 'string' },
            note: { type: 'string' },
            paymentDate: { type: 'string', format: 'date-time' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        PurchaseLineRecord: {
          type: 'object',
          properties: {
            item: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/InventoryItemRecord' }] },
            itemName: { type: 'string' },
            sku: { type: 'string' },
            quantity: { type: 'number' },
            unitCost: { type: 'number', format: 'double' },
            sellingPrice: { type: 'number', format: 'double' },
            lineTotal: { type: 'number', format: 'double' }
          }
        },
        PurchaseRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            purchaseNo: { type: 'string' },
            supplier: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/SupplierRecord' }] },
            supplierName: { type: 'string' },
            paymentType: { type: 'string', enum: ['cash', 'credit'] },
            lines: { type: 'array', items: { $ref: '#/components/schemas/PurchaseLineRecord' } },
            subTotal: { type: 'number', format: 'double' },
            discount: { type: 'number', format: 'double' },
            totalAmount: { type: 'number', format: 'double' },
            amountPaid: { type: 'number', format: 'double' },
            balanceDue: { type: 'number', format: 'double' },
            purchaseDate: { type: 'string', format: 'date-time' },
            note: { type: 'string' },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ProcurementOverview: {
          type: 'object',
          properties: {
            inventory: {
              type: 'object',
              properties: {
                itemsCount: { type: 'integer' },
                lowStockCount: { type: 'integer' },
                outOfStockCount: { type: 'integer' }
              }
            },
            suppliers: {
              type: 'object',
              properties: {
                suppliersCount: { type: 'integer' }
              }
            },
            adjustments: {
              type: 'object',
              properties: {
                count: { type: 'integer' },
                addedQuantity: { type: 'number' }
              }
            },
            damagedStock: {
              type: 'object',
              properties: {
                count: { type: 'integer' },
                quantity: { type: 'number' }
              }
            }
          }
        },
        SalesDashboard: {
          type: 'object',
          properties: {
            totals: {
              type: 'object',
              properties: {
                totalSalesAmount: { type: 'number', format: 'double' },
                totalPaid: { type: 'number', format: 'double' },
                totalBalance: { type: 'number', format: 'double' },
                totalCount: { type: 'integer' }
              }
            },
            byType: {
              type: 'object',
              properties: {
                cash: {
                  type: 'object',
                  properties: {
                    totalSalesAmount: { type: 'number', format: 'double' },
                    totalPaid: { type: 'number', format: 'double' },
                    totalBalance: { type: 'number', format: 'double' },
                    count: { type: 'integer' }
                  }
                },
                credit: {
                  type: 'object',
                  properties: {
                    totalSalesAmount: { type: 'number', format: 'double' },
                    totalPaid: { type: 'number', format: 'double' },
                    totalBalance: { type: 'number', format: 'double' },
                    count: { type: 'integer' }
                  }
                }
              }
            },
            recentSales: { type: 'array', items: { $ref: '#/components/schemas/SaleRecord' } }
          }
        },
        ReportOverview: {
          type: 'object',
          properties: {
            period: {
              type: 'object',
              properties: {
                from: { type: 'string', nullable: true },
                to: { type: 'string', nullable: true }
              }
            },
            generatedAt: { type: 'string', format: 'date-time' },
            financial: {
              type: 'object',
              properties: {
                totalSales: { type: 'number', format: 'double' },
                totalExpenses: { type: 'number', format: 'double' },
                totalOtherIncome: { type: 'number', format: 'double' },
                totalCreditCollections: { type: 'number', format: 'double' },
                totalCustomerPayments: { type: 'number', format: 'double' },
                netCashPosition: { type: 'number', format: 'double' }
              }
            },
            sales: {
              type: 'object',
              properties: {
                totals: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    totalAmount: { type: 'number', format: 'double' },
                    totalPaid: { type: 'number', format: 'double' },
                    totalBalance: { type: 'number', format: 'double' }
                  }
                },
                byType: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string', enum: ['cash', 'credit'] },
                      count: { type: 'integer' },
                      totalAmount: { type: 'number', format: 'double' },
                      totalPaid: { type: 'number', format: 'double' },
                      totalBalance: { type: 'number', format: 'double' }
                    }
                  }
                }
              }
            },
            inventory: {
              type: 'object',
              properties: {
                itemsCount: { type: 'integer' },
                lowStockCount: { type: 'integer' },
                outOfStockCount: { type: 'integer' },
                inventoryValue: { type: 'number', format: 'double' },
                adjustments: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    quantityChanged: { type: 'number' }
                  }
                },
                damagedStock: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    quantity: { type: 'number' }
                  }
                }
              }
            },
            receivablesPayables: {
              type: 'object',
              properties: {
                totalCustomerReceivables: { type: 'number', format: 'double' },
                totalSupplierPayables: { type: 'number', format: 'double' },
                totalSupplierPayments: { type: 'number', format: 'double' },
                customersCount: { type: 'integer' },
                suppliersCount: { type: 'integer' }
              }
            },
            topSellingItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  itemName: { type: 'string' },
                  quantity: { type: 'number' },
                  revenue: { type: 'number', format: 'double' }
                }
              }
            }
          }
        },
        AuditEventRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            module: { type: 'string' },
            action: { type: 'string' },
            actor: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' }
                  }
                }
              ]
            },
            entityType: { type: 'string' },
            entityId: { type: 'string' },
            metadata: { type: 'object', additionalProperties: true },
            branch: { type: 'string', enum: ['maganjo', 'matugga'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Service health check',
          responses: {
            200: {
              description: 'Backend process and database status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Backend is running' },
                      data: {
                        type: 'object',
                        properties: {
                          database: {
                            type: 'object',
                            properties: {
                              connected: { type: 'boolean', example: true },
                              transactionsSupported: { type: 'boolean', example: true },
                              checkedAt: { type: 'string', format: 'date-time' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthRequestRegister' }
              }
            }
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StandardSuccess' },
                  examples: {
                    registered: {
                      value: {
                        success: true,
                        message: 'User registered successfully',
                        data: {
                          user: {
                            _id: '65fd72db17fba29fda17bd21',
                            name: 'Alice N.',
                            email: 'alice@karibu.app',
                            role: 'sales-agent',
                            branch: 'maganjo'
                          },
                          token: 'eyJhbGciOiJIUzI1Ni...'
                        }
                      }
                    }
                  }
                }
              }
            },
            400: { $ref: '#/components/responses/BadRequest' }
          }
        }
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Authenticate user and return JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthRequestLogin' }
              }
            }
          },
          responses: {
            200: {
              description: 'Successful login',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Login successful' },
                      data: { $ref: '#/components/schemas/AuthData' }
                    }
                  }
                }
              }
            },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          security: secured,
          responses: {
            200: {
              description: 'Current authenticated user profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      '/api/v1/accounting/overview': {
        get: {
          tags: ['Accounting'],
          summary: 'Accounting overview',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Accounting totals and counts',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          overview: { $ref: '#/components/schemas/AccountingOverview' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          overview: {
                            totalExpenses: 450000,
                            totalCreditCollections: 240000,
                            totalOtherIncome: 110000,
                            netBalance: -100000,
                            counts: {
                              expenses: 6,
                              creditCollections: 3,
                              otherIncome: 2
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/accounting/expenses': {
        get: {
          tags: ['Accounting'],
          summary: 'List expenses',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' }
          ],
          responses: {
            200: {
              description: 'Paged list of expenses',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          items: { type: 'array', items: { $ref: '#/components/schemas/ExpenseRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          items: [
                            {
                              _id: '65fd72db17fba29fda17c201',
                              title: 'Fuel',
                              amount: 120000,
                              category: 'Transport',
                              note: 'Delivery bike fuel',
                              expenseDate: '2026-03-04T08:20:00.000Z',
                              branch: 'maganjo'
                            }
                          ],
                          pagination: { page: 1, limit: 20, total: 1 }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Accounting'],
          summary: 'Create expense',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExpenseInput' }
              }
            }
          },
          responses: {
            201: { description: 'Expense created successfully' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/accounting/expenses/{id}': {
        delete: {
          tags: ['Accounting'],
          summary: 'Delete expense',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          responses: {
            200: { description: 'Expense deleted' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/accounting/credit-collections': {
        get: {
          tags: ['Accounting'],
          summary: 'List credit collections',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' }
          ],
          responses: {
            200: {
              description: 'Paged list of credit collections',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          items: { type: 'array', items: { $ref: '#/components/schemas/CreditCollectionRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Accounting'],
          summary: 'Create credit collection',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreditCollectionInput' }
              }
            }
          },
          responses: {
            201: { description: 'Credit collection created' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/accounting/other-income': {
        get: {
          tags: ['Accounting'],
          summary: 'List other income',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' }
          ],
          responses: {
            200: {
              description: 'Paged list of other income',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          items: { type: 'array', items: { $ref: '#/components/schemas/OtherIncomeRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Accounting'],
          summary: 'Create other income',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OtherIncomeInput' }
              }
            }
          },
          responses: {
            201: { description: 'Other income created' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/accounting/export': {
        get: {
          tags: ['Accounting'],
          summary: 'Export accounting data',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Overview plus expense, credit collection, and income datasets',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          overview: { $ref: '#/components/schemas/AccountingOverview' },
                          expenses: { type: 'array', items: { $ref: '#/components/schemas/ExpenseRecord' } },
                          creditCollections: { type: 'array', items: { $ref: '#/components/schemas/CreditCollectionRecord' } },
                          otherIncome: { type: 'array', items: { $ref: '#/components/schemas/OtherIncomeRecord' } }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          overview: {
                            totalExpenses: 450000,
                            totalCreditCollections: 240000,
                            totalOtherIncome: 110000,
                            netBalance: -100000,
                            counts: { expenses: 6, creditCollections: 3, otherIncome: 2 }
                          },
                          expenses: [],
                          creditCollections: [],
                          otherIncome: []
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      '/api/v1/procurement/overview': {
        get: {
          tags: ['Procurement'],
          summary: 'Procurement overview',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Procurement overview totals',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          overview: { $ref: '#/components/schemas/ProcurementOverview' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          overview: {
                            inventory: { itemsCount: 45, lowStockCount: 8, outOfStockCount: 3 },
                            suppliers: { suppliersCount: 12 },
                            adjustments: { count: 9, addedQuantity: 120 },
                            damagedStock: { count: 2, quantity: 6 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/procurement/items': {
        get: {
          tags: ['Procurement'],
          summary: 'List inventory items',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/search' },
            { in: 'query', name: 'lowStock', required: false, schema: { type: 'boolean' } },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' }
          ],
          responses: {
            200: {
              description: 'Paged inventory item list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          items: { type: 'array', items: { $ref: '#/components/schemas/InventoryItemRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: { tags: ['Procurement'], summary: 'Create inventory item', security: secured }
      },
      '/api/v1/procurement/inventory-adjustments': {
        post: { tags: ['Procurement'], summary: 'Record inventory adjustment', security: secured }
      },
      '/api/v1/procurement/damaged-stock': {
        post: { tags: ['Procurement'], summary: 'Record damaged stock', security: secured }
      },
      '/api/v1/procurement/suppliers': {
        get: {
          tags: ['Procurement'],
          summary: 'List suppliers',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/search' },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' }
          ],
          responses: {
            200: {
              description: 'Paged supplier list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          suppliers: { type: 'array', items: { $ref: '#/components/schemas/SupplierRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Procurement'],
          summary: 'Create supplier',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SupplierInput' }
              }
            }
          },
          responses: {
            201: { description: 'Supplier created' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/procurement/suppliers/{id}': {
        patch: {
          tags: ['Procurement'],
          summary: 'Update supplier',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SupplierUpdateInput' }
              }
            }
          },
          responses: {
            200: { description: 'Supplier updated' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        },
        delete: {
          tags: ['Procurement'],
          summary: 'Delete supplier',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          responses: {
            200: { description: 'Supplier deleted' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/procurement/suppliers/{id}/payment-actions': {
        post: {
          tags: ['Procurement'],
          summary: 'Record supplier payment action',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SupplierPaymentInput' }
              }
            }
          },
          responses: {
            200: { description: 'Supplier payment action recorded' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/procurement/purchases': {
        get: {
          tags: ['Procurement'],
          summary: 'List purchases',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' },
            { in: 'query', name: 'supplierId', required: false, schema: { type: 'string' } },
            { in: 'query', name: 'paymentType', required: false, schema: { type: 'string', enum: ['cash', 'credit'] } },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' }
          ],
          responses: {
            200: {
              description: 'Paged purchase list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          purchases: { type: 'array', items: { $ref: '#/components/schemas/PurchaseRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          purchases: [
                            {
                              _id: '65fd72db17fba29fda17c501',
                              purchaseNo: 'PO-MGN-20260304-0003',
                              supplierName: 'Nile Distributors Ltd',
                              paymentType: 'credit',
                              totalAmount: 680000,
                              amountPaid: 200000,
                              balanceDue: 480000,
                              purchaseDate: '2026-03-04T11:00:00.000Z'
                            }
                          ],
                          pagination: { page: 1, limit: 20, total: 1 }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Procurement'],
          summary: 'Create purchase',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PurchaseInput' }
              }
            }
          },
          responses: {
            201: { description: 'Purchase recorded' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/procurement/purchases/{id}': {
        get: {
          tags: ['Procurement'],
          summary: 'Get purchase by id',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          responses: {
            200: {
              description: 'Purchase details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          purchase: { $ref: '#/components/schemas/PurchaseRecord' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/procurement/stock-report': {
        get: {
          tags: ['Procurement'],
          summary: 'Stock report',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/search' }],
          responses: {
            200: {
              description: 'Current stock report',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          summary: {
                            type: 'object',
                            properties: {
                              totalItems: { type: 'integer' },
                              lowStockItems: { type: 'integer' },
                              outOfStockItems: { type: 'integer' }
                            }
                          },
                          items: { type: 'array', items: { $ref: '#/components/schemas/InventoryItemRecord' } }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          summary: { totalItems: 45, lowStockItems: 8, outOfStockItems: 3 },
                          items: [
                            {
                              _id: '65fd72db17fba29fda17be10',
                              name: 'Soda Crate',
                              sku: 'SD-CRATE-01',
                              quantityOnHand: 14,
                              minQty: 20,
                              unitCost: 12000,
                              sellingPrice: 15000
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/procurement/purchase-report': {
        get: {
          tags: ['Procurement'],
          summary: 'Purchase report',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Purchase report summary and entries',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          summary: {
                            type: 'object',
                            properties: {
                              totalEntries: { type: 'integer' },
                              totalPurchasedQty: { type: 'number' },
                              totalPurchaseValue: { type: 'number', format: 'double' },
                              totalOutstandingCredit: { type: 'number', format: 'double' }
                            }
                          },
                          purchases: { type: 'array', items: { $ref: '#/components/schemas/PurchaseRecord' } }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/procurement/receipts': {
        get: {
          tags: ['Procurement'],
          summary: 'List procurement receipts',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Supplier payment receipts',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          receipts: { type: 'array', items: { $ref: '#/components/schemas/SupplierPaymentRecord' } }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/procurement/reports/export': {
        get: {
          tags: ['Procurement'],
          summary: 'Export procurement reports',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Overview and procurement datasets for export',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          overview: { $ref: '#/components/schemas/ProcurementOverview' },
                          stockReport: {
                            type: 'object',
                            properties: {
                              summary: { type: 'object', additionalProperties: true },
                              items: { type: 'array', items: { $ref: '#/components/schemas/InventoryItemRecord' } }
                            }
                          },
                          purchaseReport: {
                            type: 'object',
                            properties: {
                              summary: { type: 'object', additionalProperties: true },
                              purchases: { type: 'array', items: { $ref: '#/components/schemas/PurchaseRecord' } }
                            }
                          },
                          receipts: {
                            type: 'object',
                            properties: {
                              receipts: { type: 'array', items: { $ref: '#/components/schemas/SupplierPaymentRecord' } }
                            }
                          }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          overview: {
                            inventory: { itemsCount: 45, lowStockCount: 8, outOfStockCount: 3 },
                            suppliers: { suppliersCount: 12 },
                            adjustments: { count: 9, addedQuantity: 120 },
                            damagedStock: { count: 2, quantity: 6 }
                          },
                          stockReport: { summary: { totalItems: 45, lowStockItems: 8, outOfStockItems: 3 }, items: [] },
                          purchaseReport: { summary: { totalEntries: 5, totalPurchasedQty: 210, totalPurchaseValue: 2800000, totalOutstandingCredit: 900000 }, purchases: [] },
                          receipts: { receipts: [] }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      '/api/v1/sales/dashboard': {
        get: {
          tags: ['Sales'],
          summary: 'Sales dashboard',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Sales totals by type plus recent sales',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          dashboard: { $ref: '#/components/schemas/SalesDashboard' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          dashboard: {
                            totals: { totalSalesAmount: 1580000, totalPaid: 1300000, totalBalance: 280000, totalCount: 16 },
                            byType: {
                              cash: { totalSalesAmount: 980000, totalPaid: 980000, totalBalance: 0, count: 10 },
                              credit: { totalSalesAmount: 600000, totalPaid: 320000, totalBalance: 280000, count: 6 }
                            },
                            recentSales: []
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/sales/cash-sales': {
        post: {
          tags: ['Sales'],
          summary: 'Create cash sale',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCashSaleInput' }
              }
            }
          },
          responses: {
            201: { description: 'Cash sale created' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/sales/credit-sales': {
        post: {
          tags: ['Sales'],
          summary: 'Create credit sale',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCreditSaleInput' }
              }
            }
          },
          responses: {
            201: { description: 'Credit sale created' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/sales/customers': {
        get: {
          tags: ['Sales'],
          summary: 'List customers',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/search' }],
          responses: {
            200: {
              description: 'Customer list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          customers: { type: 'array', items: { $ref: '#/components/schemas/CustomerRecord' } }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          customers: [
                            {
                              _id: '65fd72db17fba29fda17bf90',
                              name: 'Jane K',
                              tel: '+256700123456',
                              nin: 'CM12345678ABC',
                              totalCredit: 320000,
                              totalPaid: 120000,
                              accountBalance: 200000
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Sales'],
          summary: 'Create customer',
          security: secured,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CustomerInput' }
              }
            }
          },
          responses: {
            201: { description: 'Customer created' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            409: {
              description: 'Duplicate customer tel or NIN',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
            }
          }
        }
      },
      '/api/v1/sales/customers/{id}': {
        patch: {
          tags: ['Sales'],
          summary: 'Update customer',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CustomerUpdateInput' }
              }
            }
          },
          responses: {
            200: { description: 'Customer updated' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        },
        delete: {
          tags: ['Sales'],
          summary: 'Delete customer',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          responses: {
            200: { description: 'Customer deleted' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/sales/customers/{id}/payments': {
        get: {
          tags: ['Sales'],
          summary: 'List customer payments',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/idPath' },
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' }
          ],
          responses: {
            200: {
              description: 'Customer payments and summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          customer: { $ref: '#/components/schemas/CustomerRecord' },
                          summary: {
                            type: 'object',
                            properties: {
                              paymentCount: { type: 'integer' },
                              totalPaidInRange: { type: 'number', format: 'double' }
                            }
                          },
                          payments: { type: 'array', items: { $ref: '#/components/schemas/CustomerPaymentRecord' } }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        },
        post: {
          tags: ['Sales'],
          summary: 'Create customer payment',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CustomerPaymentInput' }
              }
            }
          },
          responses: {
            201: { description: 'Customer payment recorded' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/sales': {
        get: {
          tags: ['Sales'],
          summary: 'List sales',
          security: secured,
          parameters: [
            { in: 'query', name: 'type', required: false, schema: { type: 'string', enum: ['cash', 'credit'] } },
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' }
          ],
          responses: {
            200: {
              description: 'Sales list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          sales: { type: 'array', items: { $ref: '#/components/schemas/SaleRecord' } }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          sales: [
                            {
                              _id: '65fd72db17fba29fda17d001',
                              saleNo: 'CR-MGN-20260304-0002',
                              saleType: 'credit',
                              customerName: 'Jane K',
                              totalAmount: 180000,
                              amountPaid: 50000,
                              balanceDue: 130000,
                              saleDate: '2026-03-04T13:12:00.000Z'
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/sales/{id}': {
        get: {
          tags: ['Sales'],
          summary: 'Get sale by id',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          responses: {
            200: {
              description: 'Sale details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          sale: { $ref: '#/components/schemas/SaleRecord' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/v1/sales/daily-report': {
        get: {
          tags: ['Sales'],
          summary: 'Daily sales report',
          security: secured,
          parameters: [{ in: 'query', name: 'date', required: false, schema: { type: 'string', format: 'date' } }],
          responses: {
            200: {
              description: 'Daily sales summary and records',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          summary: {
                            type: 'object',
                            properties: {
                              date: { type: 'string' },
                              count: { type: 'integer' },
                              totalSales: { type: 'number', format: 'double' },
                              totalPaid: { type: 'number', format: 'double' },
                              totalBalance: { type: 'number', format: 'double' },
                              cashSales: { type: 'number', format: 'double' },
                              creditSales: { type: 'number', format: 'double' }
                            }
                          },
                          sales: { type: 'array', items: { $ref: '#/components/schemas/SaleRecord' } }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          summary: {
                            date: '2026-03-04',
                            count: 16,
                            totalSales: 1580000,
                            totalPaid: 1300000,
                            totalBalance: 280000,
                            cashSales: 980000,
                            creditSales: 600000
                          },
                          sales: []
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/sales/export': {
        get: {
          tags: ['Sales'],
          summary: 'Export sales data',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Dashboard and sales datasets for export',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          dashboard: { $ref: '#/components/schemas/SalesDashboard' },
                          sales: { type: 'array', items: { $ref: '#/components/schemas/SaleRecord' } }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      '/api/v1/report/overview': {
        get: {
          tags: ['Report'],
          summary: 'Combined report overview',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Consolidated cross-module overview',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          overview: { $ref: '#/components/schemas/ReportOverview' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          overview: {
                            period: { from: '2026-03-01', to: '2026-03-04' },
                            generatedAt: '2026-03-04T15:30:00.000Z',
                            financial: {
                              totalSales: 1580000,
                              totalExpenses: 450000,
                              totalOtherIncome: 110000,
                              totalCreditCollections: 240000,
                              totalCustomerPayments: 90000,
                              netCashPosition: 1570000
                            },
                            sales: { totals: { count: 16, totalAmount: 1580000, totalPaid: 1300000, totalBalance: 280000 }, byType: [] },
                            inventory: { itemsCount: 45, lowStockCount: 8, outOfStockCount: 3, inventoryValue: 5400000, adjustments: { count: 9, quantityChanged: 120 }, damagedStock: { count: 2, quantity: 6 } },
                            receivablesPayables: { totalCustomerReceivables: 280000, totalSupplierPayables: 900000, totalSupplierPayments: 420000, customersCount: 28, suppliersCount: 12 },
                            topSellingItems: []
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/report/export': {
        get: {
          tags: ['Report'],
          summary: 'Export report data',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/fromDate' }, { $ref: '#/components/parameters/toDate' }],
          responses: {
            200: {
              description: 'Consolidated overview and report datasets',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          overview: { $ref: '#/components/schemas/ReportOverview' },
                          datasets: {
                            type: 'object',
                            properties: {
                              sales: { type: 'array', items: { $ref: '#/components/schemas/SaleRecord' } },
                              expenses: { type: 'array', items: { $ref: '#/components/schemas/ExpenseRecord' } },
                              creditCollections: { type: 'array', items: { $ref: '#/components/schemas/CreditCollectionRecord' } },
                              otherIncome: { type: 'array', items: { $ref: '#/components/schemas/OtherIncomeRecord' } },
                              customerPayments: { type: 'array', items: { $ref: '#/components/schemas/CustomerPaymentRecord' } },
                              supplierPayments: { type: 'array', items: { $ref: '#/components/schemas/SupplierPaymentRecord' } }
                            }
                          }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          overview: {
                            period: { from: '2026-03-01', to: '2026-03-04' },
                            generatedAt: '2026-03-04T15:30:00.000Z'
                          },
                          datasets: {
                            sales: [],
                            expenses: [],
                            creditCollections: [],
                            otherIncome: [],
                            customerPayments: [],
                            supplierPayments: []
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },

      '/api/v1/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',
          security: secured,
          responses: {
            200: {
              description: 'User list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          users: { type: 'array', items: { $ref: '#/components/schemas/User' } }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' }
          }
        }
      },
      '/api/v1/users/audit-events': {
        get: {
          tags: ['Users'],
          summary: 'List audit events',
          security: secured,
          parameters: [
            { $ref: '#/components/parameters/fromDate' },
            { $ref: '#/components/parameters/toDate' },
            { $ref: '#/components/parameters/page' },
            { $ref: '#/components/parameters/limit' },
            {
              in: 'query',
              name: 'module',
              required: false,
              schema: { type: 'string', enum: ['sales', 'procurement', 'accounting', 'users', 'report', 'auth'] }
            },
            { in: 'query', name: 'action', required: false, schema: { type: 'string' } }
          ],
          responses: {
            200: {
              description: 'Audit events list with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          items: { type: 'array', items: { $ref: '#/components/schemas/AuditEventRecord' } },
                          pagination: { $ref: '#/components/schemas/Pagination' }
                        }
                      }
                    }
                  },
                  examples: {
                    sample: {
                      value: {
                        success: true,
                        data: {
                          items: [
                            {
                              _id: '65fd72db17fba29fda17e001',
                              module: 'sales',
                              action: 'credit-sale.created',
                              actor: {
                                _id: '65fd72db17fba29fda17bd21',
                                name: 'Admin User',
                                email: 'admin@karibu.app',
                                role: 'admin'
                              },
                              entityType: 'Sale',
                              entityId: '65fd72db17fba29fda17d001',
                              metadata: {
                                saleNo: 'CR-MGN-20260304-0002',
                                totalAmount: 180000,
                                amountPaid: 50000,
                                balanceDue: 130000
                              },
                              branch: 'maganjo',
                              createdAt: '2026-03-04T13:12:30.000Z'
                            }
                          ],
                          pagination: { page: 1, limit: 20, total: 1 }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' }
          }
        }
      },
      '/api/v1/users/{id}/role': {
        patch: {
          tags: ['Users'],
          summary: 'Update user role',
          security: secured,
          parameters: [{ $ref: '#/components/parameters/idPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleUpdateInput' }
              }
            }
          },
          responses: {
            200: { description: 'User role updated' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerSpec
};
