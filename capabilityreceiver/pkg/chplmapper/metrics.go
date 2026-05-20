package chplmapper

import (
	"sync/atomic"
)

var vendorRegressionsPrevented uint64

func IncVendorRegressionPrevented() {
	atomic.AddUint64(&vendorRegressionsPrevented, 1)
}

func VendorRegressionsPrevented() uint64 {
	return atomic.LoadUint64(&vendorRegressionsPrevented)
}

func ResetVendorRegressionsPrevented() {
	atomic.StoreUint64(&vendorRegressionsPrevented, 0)
}
