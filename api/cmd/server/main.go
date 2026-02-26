package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/config"
	"github.com/onc-healthit/lantern-back-end/api/internal/database"
	"github.com/onc-healthit/lantern-back-end/api/internal/router"
)

func main() {
	log.SetFormatter(&log.TextFormatter{FullTimestamp: true})

	config.Setup()
	cfg := config.NewFromViper()

	log.WithFields(log.Fields{
		"host": cfg.DBHost,
		"port": cfg.DBPort,
		"name": cfg.DBName,
		"user": cfg.DBUser,
	}).Info("Connecting to database")

	db, err := database.NewPool(cfg)
	if err != nil {
		log.WithError(err).Fatal("Failed to connect to database")
	}
	defer db.Close()
	log.Info("Successfully connected to database")

	r := router.New(db, cfg)

	addr := fmt.Sprintf(":%d", cfg.APIPort)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.WithField("addr", addr).Info("Starting API server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.WithError(err).Fatal("Server failed")
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.WithField("signal", sig).Info("Shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.WithError(err).Fatal("Server forced to shutdown")
	}

	log.Info("Server stopped")
}
