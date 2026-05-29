import { Badge, Button, Card } from '@/components/ui/index.jsx'
import { fieldName } from '@/utils/lang'

const money = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function ProductCard({ product, i18n, canManage, onEdit, onMove, labels = {} }) {
  const stockQty = Number(product.stock_qty || 0)
  const minStock = Number(product.min_stock || 0)
  const isLow = stockQty <= minStock

  return (
    <Card className="h-full flex flex-col">
      <div className="aspect-[4/3] rounded-2xl bg-slate-100 overflow-hidden mb-4 flex items-center justify-center">
        {product.image_url ? (
          <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-black text-slate-300">{product.product_name?.[0] || 'P'}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{product.product_name}</p>
            <p className="text-xs text-slate-500 truncate">{product.sku}</p>
          </div>
          <Badge color={isLow ? 'red' : 'green'}>{isLow ? labels.low || 'Low' : labels.ok || 'OK'}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{labels.stock || 'Stock'}</p>
            <p className="font-bold text-slate-900">{stockQty} {product.unit}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{labels.min || 'Min'}</p>
            <p className="font-bold text-slate-900">{minStock} {product.unit}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{labels.cost || 'Cost'}</p>
            <p className="font-bold text-slate-900">{money(product.cost_price)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{labels.sell || 'Sell'}</p>
            <p className="font-bold text-slate-900">{money(product.selling_price)}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3 truncate">{fieldName(i18n, product.categories) || labels.uncategorized || 'Uncategorized'}</p>
      </div>

      {canManage && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="secondary" onClick={() => onEdit(product)}>{labels.edit || 'Edit'}</Button>
          <Button onClick={() => onMove(product)}>{labels.stockAction || 'Stock'}</Button>
        </div>
      )}
    </Card>
  )
}
