# Use official Nginx as base image
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove default Nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY . .

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
