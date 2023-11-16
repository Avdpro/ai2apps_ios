#import <WebKit/WebKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^HandleType) (NSDictionary*);

@interface WebViewUtil : NSObject

+ (void)applicationDidFinishLaunchingWithOptions:(NSDictionary *)launchOptions;
+ (void)applicationOpenURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options;

- (instancetype)initWithFrame:(CGRect)frame code:(NSString*)code domain:(NSString*)domain index:(NSString*)index params:(NSDictionary*)params;

- (void)sendMessage:(NSDictionary*)message;
- (void)registerInterface:(NSString*)name handler:(HandleType)handler;

- (void)loadIndex;
- (void)refresh;

- (void)callJS:(NSString*)name data:(NSDictionary*)data handler:(HandleType)handler;

@property(nullable, nonatomic, readonly, getter=getWebView) WKWebView *webView;
@property (nonatomic, strong) NSMutableDictionary *_JSCallbacks;

@end

NS_ASSUME_NONNULL_END
