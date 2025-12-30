# Trading Domain Context

This skill provides domain knowledge and context for trading and financial systems.

## Skill Overview

**Purpose**: Provide context about trading systems, financial terminology, and domain-specific patterns

**When to use**: When working with trading-related Jira tickets or Confluence documentation

## Trading System Components

### Core Components

#### Order Management System (OMS)
- **Purpose**: Handle order lifecycle from creation to execution
- **Key Functions**:
  - Order validation
  - Risk checks
  - Routing to exchanges
  - Order status tracking
  - Fill management

#### Execution Management System (EMS)
- **Purpose**: Optimize trade execution
- **Key Functions**:
  - Smart order routing
  - Algorithmic trading
  - Market impact minimization
  - Execution analytics

#### Risk Management System
- **Purpose**: Monitor and control trading risk
- **Key Functions**:
  - Pre-trade risk checks
  - Position limits monitoring
  - Real-time P&L calculation
  - Exposure tracking
  - VaR calculation

#### Market Data System
- **Purpose**: Provide real-time and historical market data
- **Key Functions**:
  - Live price feeds
  - Order book data
  - Trade and quote data
  - Market depth information
  - Historical data storage

#### Position Management
- **Purpose**: Track all positions across instruments and accounts
- **Key Functions**:
  - Real-time position tracking
  - Multi-currency support
  - Corporate actions processing
  - Position reconciliation

## Trading Terminology

### Order Types

- **Market Order**: Execute immediately at best available price
- **Limit Order**: Execute only at specified price or better
- **Stop Order**: Becomes market order when stop price is reached
- **Stop-Limit Order**: Becomes limit order when stop price is reached
- **IOC (Immediate or Cancel)**: Execute immediately, cancel unfilled portion
- **FOK (Fill or Kill)**: Execute entire order immediately or cancel
- **GTC (Good Till Cancel)**: Active until filled or explicitly canceled
- **Day Order**: Valid only for the trading day

### Trading Concepts

- **Bid**: Highest price buyer willing to pay
- **Ask/Offer**: Lowest price seller willing to accept
- **Spread**: Difference between bid and ask
- **Fill**: Executed portion of an order
- **Slippage**: Difference between expected and actual execution price
- **Liquidity**: Ease of buying/selling without price impact
- **Market Maker**: Provider of liquidity, quotes both sides
- **Tick Size**: Minimum price increment for an instrument

### Risk Metrics

- **P&L (Profit & Loss)**: Realized and unrealized gains/losses
- **VaR (Value at Risk)**: Maximum expected loss over time period
- **Sharpe Ratio**: Risk-adjusted return measure
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Beta**: Sensitivity to market movements
- **Delta**: Price sensitivity to underlying asset
- **Gamma**: Rate of change of delta
- **Vega**: Sensitivity to volatility changes
- **Theta**: Time decay of option value

### Market Participants

- **Retail Trader**: Individual trading personal account
- **Institutional Investor**: Pension funds, mutual funds, insurance
- **Hedge Fund**: Active investment fund using varied strategies
- **Market Maker**: Provides liquidity, profits from spread
- **High-Frequency Trader (HFT)**: Uses algorithms for rapid trading
- **Proprietary Trader**: Trades firm's own capital

## Common Trading Workflows

### Order Lifecycle

```
1. Order Creation
   ↓
2. Pre-Trade Validation
   - Instrument validation
   - Account validation
   - Quantity checks
   ↓
3. Risk Checks
   - Position limits
   - Credit checks
   - Regulatory compliance
   ↓
4. Order Routing
   - Determine best venue
   - Apply routing rules
   - Send to exchange/venue
   ↓
5. Execution
   - Full fill
   - Partial fill
   - Rejection
   ↓
6. Post-Trade Processing
   - Fill allocation
   - Position update
   - P&L calculation
   - Trade reporting
```

### Trade Settlement

```
T = Trade Date
T+1 = Confirmation
T+2 = Settlement Date (most equities)
  - Cash movement
  - Security transfer
  - Position reconciliation
```

### End-of-Day Process

```
1. Market Close
2. Final Position Reconciliation
3. P&L Calculation
4. Risk Report Generation
5. Regulatory Reporting
6. Data Archival
7. System Health Checks
```

## System Integration Patterns

### Market Data Flow

```
Exchange → Market Data Gateway → Normalization → Distribution → Applications
                                        ↓
                                   Historical Storage
```

### Order Flow

```
Trading Application → OMS → FIX Gateway → Exchange
                       ↓
                   Risk System
                       ↓
                   Compliance
```

### Real-Time vs Batch Processing

**Real-Time**:
- Order processing
- Risk monitoring
- Position updates
- P&L calculation

**Batch**:
- End-of-day reports
- Historical analytics
- Regulatory reporting
- Data archival

## Common Technical Challenges

### Performance Requirements

- **Latency**: Sub-millisecond order routing
- **Throughput**: Handle 100k+ orders/second
- **Data Volume**: Process millions of market data updates/second
- **Reliability**: 99.99%+ uptime required

### Data Challenges

- **Market Data**: High volume, low latency required
- **Historical Data**: Petabyte-scale storage
- **Data Quality**: Critical for trading decisions
- **Synchronization**: Multiple systems must stay in sync

### Regulatory Requirements

- **MiFID II**: European markets regulation
- **Reg NMS**: US market structure rules
- **Dodd-Frank**: US financial reform
- **EMIR**: European derivatives regulation
- **MAR**: Market abuse regulation

### Common Issues

1. **Order Rejections**
   - Insufficient funds
   - Position limit breached
   - Invalid instrument
   - Market closed

2. **Fill Discrepancies**
   - Partial fills not updated
   - Duplicate fill reports
   - Incorrect fill prices
   - Missing fills

3. **Position Breaks**
   - Intraday vs EOD mismatch
   - Corporate actions not processed
   - Settlement failures
   - Cross-system inconsistencies

4. **Market Data Issues**
   - Feed latency
   - Missing quotes
   - Incorrect prices
   - Symbol mapping errors

## Documentation Patterns for Trading Systems

### API Documentation

```markdown
## Endpoint: Submit Order

**Method**: POST
**Path**: `/api/v1/orders`

**Request**:
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 100,
  "orderType": "LIMIT",
  "price": 150.50,
  "timeInForce": "GTC",
  "account": "ACC123"
}
```

**Response**:
```json
{
  "orderId": "ORD-20250115-001",
  "status": "PENDING",
  "timestamp": "2025-01-15T10:30:00.123Z"
}
```

**Error Codes**:
- `400`: Invalid request parameters
- `403`: Insufficient permissions
- `429`: Rate limit exceeded
- `500`: Internal server error
```

### Runbook Example

```markdown
# Order Rejection Spike Runbook

## Symptoms
- Order rejection rate > 5%
- Alerts firing: OrderRejectionRateHigh
- Users reporting order failures

## Investigation Steps

1. **Check System Status**
   ```bash
   curl https://status.trading.internal/health
   ```

2. **Review Recent Deployments**
   - Check if any OMS changes deployed
   - Review risk system updates

3. **Analyze Rejection Reasons**
   ```sql
   SELECT rejection_reason, COUNT(*)
   FROM order_rejections
   WHERE timestamp > NOW() - INTERVAL '1 hour'
   GROUP BY rejection_reason;
   ```

4. **Common Causes**:
   - Position limits reduced
   - Market data feed delay
   - Risk system configuration change
   - Exchange connectivity issue

## Resolution Steps

[Detailed resolution steps based on root cause]

## Escalation
If unresolved in 15 minutes, escalate to Trading Technology Lead
```

### Architecture Documentation

```markdown
# Trading Platform Architecture

## System Overview

```
┌─────────────┐
│   Traders   │
└──────┬──────┘
       │
┌──────▼──────────────────────────┐
│   Trading Application (Web)     │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│   Order Management System       │
│   - Validation                  │
│   - Routing                     │
│   - State Management            │
└──┬───────────────────────────┬──┘
   │                           │
┌──▼─────────────┐    ┌────────▼──────────┐
│  Risk System   │    │  Market Data Feed │
└────────────────┘    └───────────────────┘
   │                           │
┌──▼───────────────────────────▼──┐
│          Exchanges               │
└──────────────────────────────────┘
```

## Data Flow

1. User submits order via UI
2. OMS validates order parameters
3. Risk system performs pre-trade checks
4. Order routed to appropriate exchange
5. Execution updates flow back through system
6. Position and P&L updated in real-time
```

## Jira Best Practices for Trading Systems

### Labels to Use

- `trading-critical`: Production-impacting issues
- `market-hours`: Must be fixed during market hours
- `after-hours`: Can wait until after market close
- `regulatory`: Compliance-related
- `performance`: Latency/throughput issues
- `data-quality`: Market/position data issues

### Priority Guidelines

**P0 - Critical**:
- Production trading system down
- Order routing failure
- Risk system breach
- Regulatory reporting failure

**P1 - High**:
- Performance degradation affecting traders
- Market data delays
- Incorrect P&L calculations

**P2 - Medium**:
- Feature requests
- Non-critical bugs
- Documentation updates

**P3 - Low**:
- Nice-to-have improvements
- Technical debt

### Ticket Template for Production Issues

```markdown
## Issue Description
[Clear description of the problem]

## Impact
- **Severity**: [Critical/High/Medium/Low]
- **Affected Systems**: [List systems]
- **Affected Users**: [Number/type of users]
- **Financial Impact**: [If applicable]

## Time Information
- **Issue Started**: YYYY-MM-DD HH:MM UTC
- **Detection Time**: YYYY-MM-DD HH:MM UTC
- **Market Hours**: [Yes/No]

## Symptoms
- [Observable symptom 1]
- [Observable symptom 2]

## Immediate Actions Taken
1. [Action 1]
2. [Action 2]

## Root Cause
[If known, otherwise "Under investigation"]

## Permanent Fix Required
- [ ] Code change
- [ ] Configuration update
- [ ] Process improvement
- [ ] Documentation update

## Related Tickets
- [Link to related incidents]
```

## Testing Considerations

### Pre-Production Testing

1. **Unit Tests**: Order validation, calculations
2. **Integration Tests**: End-to-end order flow
3. **Performance Tests**: Latency and throughput
4. **Market Simulation**: Test with realistic scenarios
5. **Disaster Recovery**: Failover testing

### Production Validation

1. **Shadow Testing**: Run new code parallel to prod
2. **Canary Releases**: Gradual rollout
3. **Feature Flags**: Enable/disable features dynamically
4. **Monitoring**: Real-time metrics and alerts

## Compliance and Audit

### Audit Trail Requirements

- All orders must be logged with timestamp
- User actions must be traceable
- System events must be recorded
- Data retention per regulatory requirements

### Common Audit Queries

```sql
-- Orders by user
SELECT * FROM orders WHERE user_id = 'U123' AND date >= '2025-01-01';

-- Large orders
SELECT * FROM orders WHERE quantity > 10000 OR notional > 1000000;

-- Orders outside normal hours
SELECT * FROM orders WHERE HOUR(timestamp) NOT BETWEEN 9 AND 16;

-- Failed risk checks
SELECT * FROM risk_checks WHERE status = 'FAILED';
```

## Key Metrics to Monitor

### Business Metrics
- Order acceptance rate
- Average fill time
- Slippage
- P&L by trader/strategy
- Market share

### Technical Metrics
- Order processing latency (p50, p95, p99)
- Market data latency
- System uptime
- Error rates
- API response times

### Risk Metrics
- Real-time positions
- Exposure by asset class
- VaR
- Margin utilization
- Limit breaches

## Quick Reference

### Time Zones
- **NYSE**: US Eastern Time (ET)
- **LSE**: UK Time (GMT/BST)
- **HKEX**: Hong Kong Time (HKT)
- **TSE**: Japan Standard Time (JST)

### Market Hours (Local Time)
- **US Equities**: 9:30 AM - 4:00 PM ET
- **US Pre-Market**: 4:00 AM - 9:30 AM ET
- **US After-Hours**: 4:00 PM - 8:00 PM ET
- **London**: 8:00 AM - 4:30 PM GMT
- **Hong Kong**: 9:30 AM - 4:00 PM HKT

### FIX Protocol Basics
- **Industry standard** for electronic trading
- **Message-based** protocol
- **Key messages**: NewOrder (D), ExecutionReport (8), OrderCancelRequest (F)
- **Tags**: 35=MsgType, 55=Symbol, 54=Side, 38=Qty, 44=Price

### Settlement Cycles
- **T+2**: Most equities (US, Europe)
- **T+1**: China A-shares, planned US move
- **T+0**: Some derivatives
