"""Configurable thresholds for Ocean Eye AI analysis."""

# Minimum number of valid readings required for statistical analysis.
MIN_READINGS = 5

# Maximum number of historical readings retrieved for one analysis.
MAX_READINGS = 500

# Sensor measurement quality-control limits.
# These are configurable plausibility checks, NOT pollution thresholds.
TEMPERATURE_MIN_C = -2.0
TEMPERATURE_MAX_C = 45.0
TURBIDITY_MIN_NTU = 0.0

# Sudden-change detection thresholds.
TEMPERATURE_CHANGE_C = 2.0
TURBIDITY_CHANGE_NTU = 5.0

# Statistical anomaly detection.
# A measurement is flagged when it is sufficiently far from
# the historical mean, measured in standard deviations.
ANOMALY_STD_DEV = 2.5

# Number of recent readings used for short-term trend analysis.
TREND_WINDOW = 10