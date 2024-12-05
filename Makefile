BASE_FILE := $(shell npm ls --parseable --silent "@mrpelz/boilerplate-node" 2>/dev/null)

export PERSISTENCE_PATH = ./tmp.json

include $(BASE_FILE)/Makefile
