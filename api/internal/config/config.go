// Package config provides Viper-based configuration for the Lantern API server.
// It follows the same LANTERN_ environment variable prefix pattern used by
// endpointmanager and other Go services in the project.
package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all configuration values for the API server.
type Config struct {
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	APIPort     int
	CORSOrigins []string
}

// Setup initializes Viper configuration with defaults and environment variable bindings.
// Environment variables use the LANTERN_ prefix (e.g., LANTERN_DBHOST).
func Setup() {
	viper.SetEnvPrefix("lantern")
	viper.AutomaticEnv()

	// Database defaults (match existing services)
	viper.SetDefault("dbhost", "localhost")
	viper.SetDefault("dbport", 5432)
	viper.SetDefault("dbuser", "lantern")
	viper.SetDefault("dbpassword", "postgrespassword")
	viper.SetDefault("dbname", "lantern")
	viper.SetDefault("dbsslmode", "disable")

	// API server defaults
	viper.SetDefault("api_port", 8080)
	viper.SetDefault("api_cors_origins", "http://localhost:3000")
}

// NewFromViper reads all configuration values from Viper into a Config struct.
// Must be called after Setup().
func NewFromViper() *Config {
	origins := strings.Split(viper.GetString("api_cors_origins"), ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	return &Config{
		DBHost:      viper.GetString("dbhost"),
		DBPort:      viper.GetInt("dbport"),
		DBUser:      viper.GetString("dbuser"),
		DBPassword:  viper.GetString("dbpassword"),
		DBName:      viper.GetString("dbname"),
		DBSSLMode:   viper.GetString("dbsslmode"),
		APIPort:     viper.GetInt("api_port"),
		CORSOrigins: origins,
	}
}

// DatabaseConnStr returns a PostgreSQL connection string.
func (c *Config) DatabaseConnStr() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s options='-c statement_timeout=120000'",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}
