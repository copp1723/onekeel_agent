#!/usr/bin/env python3
import sys
import json
import trafilatura

def get_website_text_content(url):
    """
    Extract clean, readable text content from a webpage URL.
    
    Args:
        url (str): The URL of the webpage to extract content from
        
    Returns:
        str: The extracted text content or error message
    """
    try:
        # Send a request to the website
        downloaded = trafilatura.fetch_url(url)
        
        if downloaded is None:
            return json.dumps({"error": "Failed to download content from URL"})
        
        # Extract the main content
        text = trafilatura.extract(downloaded)
        
        if text is None:
            return json.dumps({"error": "No main content could be extracted"})
        
        # Return the extracted text
        return json.dumps({"content": text})
    
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Get URL from command line arguments
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Please provide exactly one URL as an argument"}))
        sys.exit(1)
        
    url = sys.argv[1]
    
    # Extract and print the content
    print(get_website_text_content(url))